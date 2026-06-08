import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Dropdown from '../../components/Dropdown';
import { MUSCLE_GROUPS } from '../../constants/muscleGroups';
import './AdminPage.css';

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-tooltip">
      <p className="admin-tooltip-label">{formatter ? formatter(label) : label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="admin-tooltip-value" style={{ color: entry.color || '#fafafa' }}>
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toLocaleString('pt-PT') : entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);
  const [sessionsOverTime, setSessionsOverTime] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [topExercises, setTopExercises] = useState([]);
  const [volumeOverTime, setVolumeOverTime] = useState([]);
  const [exerciseStats, setExerciseStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmAction, setConfirmAction] = useState(null);

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);

  const [exSearch, setExSearch] = useState('');
  const [exMuscleFilter, setExMuscleFilter] = useState('');
  const [exPage, setExPage] = useState(1);
  const [showExForm, setShowExForm] = useState(false);
  const [newExMuscle, setNewExMuscle] = useState('');

  const PER_PAGE = 29;

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/'); return; }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [statsRes, sessionsRes, growthRes, topRes, volumeRes, detailedRes, exerciseRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/sessions-over-time'),
        api.get('/admin/user-growth'),
        api.get('/admin/top-exercises'),
        api.get('/admin/volume-over-time'),
        api.get('/admin/detailed-stats'),
        api.get('/admin/exercise-stats'),
      ]);
      setData(statsRes.data);
      setSessionsOverTime(sessionsRes.data);
      setUserGrowth(growthRes.data);
      setTopExercises(topRes.data);
      setVolumeOverTime(volumeRes.data);
      setDetailedStats(detailedRes.data);
      setExerciseStats(exerciseRes.data);
    } catch {
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { type, userId, exerciseId } = confirmAction;

      if (type === 'delete') {
        await api.delete(`/admin/exercises/${exerciseId}`);
        setExerciseStats((prev) => prev.filter((e) => e.id !== exerciseId));
        setConfirmAction(null);
        return;
      }

      const endpoint = type === 'admin'
        ? `/admin/users/${userId}/toggle-admin`
        : `/admin/users/${userId}/toggle-suspend`;

      const res = await api.patch(endpoint);

      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => {
          if (u.id !== userId) return u;
          if (type === 'admin') return { ...u, isAdmin: res.data.isAdmin };
          return { ...u, isSuspended: res.data.isSuspended };
        }),
      }));

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev) => {
          if (type === 'admin') return { ...prev, isAdmin: res.data.isAdmin };
          return { ...prev, isSuspended: res.data.isSuspended };
        });
      }

      setConfirmAction(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Erro.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  const { globals, users } = data;

  const formatMonth = (str) => {
    const [, m] = str.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[parseInt(m, 10) - 1];
  };

  const formatDay = (str) => {
    const parts = str.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  const monthlySessionsData = volumeOverTime.map((d) => ({ month: d.month, sessions: d.sessions || 0 }));

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Administracao</h1>
      </div>

      <div className="admin-tabs">
        {[
          { key: 'overview', label: 'Estatisticas' },
          { key: 'charts', label: 'Graficos' },
          { key: 'exercises', label: 'Exercicios' },
          { key: 'users', label: 'Utilizadores' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="card mb-3">
            <p className="admin-card-title">Atividade Recente</p>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={sessionsOverTime}>
                <defs>
                  <linearGradient id="gradOv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip content={<CustomTooltip formatter={formatDay} />} />
                <Area type="monotone" dataKey="count" stroke="#7c3aed" fill="url(#gradOv)" strokeWidth={2} dot={false} name="Sessoes" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card mb-3">
            <p className="admin-card-title">Plataforma</p>
            <div className="admin-stats-rows">
              <div className="admin-stats-row"><span>Utilizadores</span><strong>{globals.totalUsers}</strong></div>
              <div className="admin-stats-row"><span>Utilizadores suspensos</span><strong>{users.filter(u => u.isSuspended).length}</strong></div>
              <div className="admin-stats-row"><span>Administradores</span><strong>{users.filter(u => u.isAdmin).length}</strong></div>
              <div className="admin-stats-row"><span>Sessoes registadas</span><strong>{globals.totalSessions}</strong></div>
              <div className="admin-stats-row"><span>Planos criados</span><strong>{globals.totalPlans}</strong></div>
              <div className="admin-stats-row"><span>Exercicios do sistema</span><strong>{globals.totalSystemExercises}</strong></div>
              <div className="admin-stats-row"><span>Exercicios personalizados</span><strong>{globals.totalCustomExercises}</strong></div>
              <div className="admin-stats-row"><span>Total de exercicios</span><strong>{globals.totalSystemExercises + globals.totalCustomExercises}</strong></div>
            </div>
          </div>

          <div className="card mb-3">
            <p className="admin-card-title">Desempenho Global</p>
            <div className="admin-stats-rows">
              <div className="admin-stats-row"><span>Volume total</span><strong>{globals.totalVolume.toLocaleString('pt-PT')}</strong></div>
              <div className="admin-stats-row"><span>Repeticoes totais</span><strong>{globals.totalReps.toLocaleString('pt-PT')}</strong></div>
              <div className="admin-stats-row"><span>Peso maximo registado</span><strong>{globals.maxWeight} kg</strong></div>
              {detailedStats && (
                <>
                  <div className="admin-stats-row"><span>Peso medio</span><strong>{detailedStats.avgWeight} kg</strong></div>
                  <div className="admin-stats-row"><span>Reps media por serie</span><strong>{detailedStats.avgRepsPerSet}</strong></div>
                </>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <p className="admin-card-title">Medias</p>
            <div className="admin-stats-rows">
              <div className="admin-stats-row"><span>Sessoes por utilizador</span><strong>{globals.totalUsers > 0 ? (globals.totalSessions / globals.totalUsers).toFixed(1) : '0'}</strong></div>
              <div className="admin-stats-row"><span>Volume por sessao</span><strong>{globals.totalSessions > 0 ? Math.round(globals.totalVolume / globals.totalSessions).toLocaleString('pt-PT') : '0'}</strong></div>
              {detailedStats && (
                <>
                  <div className="admin-stats-row"><span>Exercicios por sessao</span><strong>{detailedStats.avgExercisesPerSession}</strong></div>
                  <div className="admin-stats-row"><span>Series por sessao</span><strong>{detailedStats.avgSetsPerSession}</strong></div>
                </>
              )}
            </div>
          </div>

          {detailedStats && (
            <div className="card">
              <p className="admin-card-title">Ultimos 30 Dias</p>
              <div className="admin-stats-rows">
                <div className="admin-stats-row"><span>Utilizadores ativos (7d)</span><strong>{detailedStats.activeUsers7d}</strong></div>
                <div className="admin-stats-row"><span>Utilizadores ativos (30d)</span><strong>{detailedStats.activeUsers30d}</strong></div>
                <div className="admin-stats-row"><span>Sessoes (7d)</span><strong>{detailedStats.sessions7d}</strong></div>
                <div className="admin-stats-row"><span>Sessoes (30d)</span><strong>{detailedStats.sessions30d}</strong></div>
                <div className="admin-stats-row"><span>Novos exercicios</span><strong>{detailedStats.newExercises30d}</strong></div>
                <div className="admin-stats-row"><span>Novos planos</span><strong>{detailedStats.newPlans30d}</strong></div>
              </div>
            </div>
          )}

          {exerciseStats.length > 0 && (
            <div className="card mt-4">
              <p className="admin-card-title">Exercicios Mais Populares</p>
              <div className="admin-stats-rows">
                {exerciseStats.slice(0, 8).map((ex) => (
                  <div key={ex.id} className="admin-stats-row">
                    <span>{ex.name}</span>
                    <strong>{ex.timesUsed} usos</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'charts' && (
        <div className="admin-charts-section">
          <div className="card">
            <p className="admin-card-title">Sessoes Diarias</p>
            <p className="admin-card-subtitle">Ultimos 30 dias</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sessionsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 10, fill: '#666666' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip formatter={formatDay} />} />
                <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} name="Sessoes" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <p className="admin-card-title">Sessoes Mensais</p>
            <p className="admin-card-subtitle">Ultimos 12 meses</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlySessionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip formatter={formatMonth} />} />
                <Line type="monotone" dataKey="sessions" stroke="#06b6d4" strokeWidth={2} dot={false} name="Sessoes" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <p className="admin-card-title">Crescimento de Utilizadores</p>
            <p className="admin-card-subtitle">Novos registos por mes</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip formatter={formatMonth} />} />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="Novos Utilizadores" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <p className="admin-card-title">Top 10 Exercicios</p>
            <p className="admin-card-subtitle">Mais utilizados na plataforma</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topExercises} layout="vertical" margin={{ left: 10 }} barCategoryGap="12%">
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#a1a1a1' }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} name="Utilizacoes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'exercises' && (() => {
        const filtered = exerciseStats.filter((ex) => {
          if (exMuscleFilter && ex.muscleGroup !== exMuscleFilter) return false;
          if (exSearch && !ex.name.toLowerCase().includes(exSearch.toLowerCase())) return false;
          return true;
        });
        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        const paged = filtered.slice((exPage - 1) * PER_PAGE, exPage * PER_PAGE);

        return (
          <div className="admin-exercises-section">
            {!showExForm ? (
              <button className="btn btn-primary btn-sm" onClick={() => setShowExForm(true)}>Criar Exercicio</button>
            ) : (
              <div className="card">
                <div className="admin-card-header-row">
                  <p className="admin-card-title">Criar Exercicio do Sistema</p>
                  <button className="btn-icon" onClick={() => setShowExForm(false)} aria-label="Fechar">
                    <span style={{ fontSize: '0.875rem' }}>&#x2715;</span>
                  </button>
                </div>
                <form className="admin-exercise-form" onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  const name = form.exName.value.trim();
                  const description = form.exDesc.value.trim();
                  if (!name || !newExMuscle || !description) return;
                  try {
                    const res = await api.post('/admin/exercises', { name, muscleGroup: newExMuscle, description });
                    setExerciseStats((prev) => [{ ...res.data, timesUsed: 0, uniqueUsers: 0, totalReps: 0, maxWeight: 0, avgWeight: 0, avgReps: 0, totalVolume: 0 }, ...prev]);
                    form.reset();
                    setNewExMuscle('');
                    setShowExForm(false);
                  } catch (err) {
                    alert(err.response?.data?.message || 'Erro ao criar exercicio.');
                  }
                }}>
                  <div className="admin-exercise-form-row">
                    <input name="exName" className="form-input" placeholder="Nome do exercicio" required />
                    <Dropdown
                      options={MUSCLE_GROUPS}
                      value={newExMuscle}
                      onChange={setNewExMuscle}
                      placeholder="Grupo muscular"
                      showPlaceholder={false}
                    />
                  </div>
                  <textarea name="exDesc" className="form-textarea" placeholder="Descricao do exercicio" rows="2" required />
                  <button type="submit" className="btn btn-primary btn-sm">Criar</button>
                </form>
              </div>
            )}

            <div className="admin-filters">
              <input
                className="form-input"
                placeholder="Pesquisar exercicio..."
                value={exSearch}
                onChange={(e) => { setExSearch(e.target.value); setExPage(1); }}
              />
              <Dropdown
                options={MUSCLE_GROUPS}
                value={exMuscleFilter}
                onChange={(val) => { setExMuscleFilter(val); setExPage(1); }}
                placeholder="Todos os grupos"
              />
            </div>

            <p className="text-xs text-muted">{filtered.length} exercicios</p>
            <div className="admin-exercises-table">
              <div className="admin-exercises-table-head">
                <span className="admin-ex-col-name">Exercicio</span>
                <span className="admin-ex-col">Grupo</span>
                <span className="admin-ex-col">Usos</span>
                <span className="admin-ex-col">Users</span>
                <span className="admin-ex-col">Reps</span>
                <span className="admin-ex-col">Peso Max</span>
                <span className="admin-ex-col">Peso Med</span>
                <span className="admin-ex-col">Volume</span>
                <span className="admin-ex-col"></span>
              </div>
              {paged.map((ex) => (
                <div key={ex.id} className="admin-exercises-table-row">
                  <span className="admin-ex-col-name">{ex.name}</span>
                  <span className="admin-ex-col"><span className="admin-ex-muscle">{ex.muscleGroup}</span></span>
                  <span className="admin-ex-col">{ex.timesUsed}</span>
                  <span className="admin-ex-col">{ex.uniqueUsers}</span>
                  <span className="admin-ex-col">{ex.totalReps.toLocaleString('pt-PT')}</span>
                  <span className="admin-ex-col">{ex.maxWeight > 0 ? `${ex.maxWeight} kg` : '-'}</span>
                  <span className="admin-ex-col">{ex.avgWeight > 0 ? `${ex.avgWeight} kg` : '-'}</span>
                  <span className="admin-ex-col">{ex.totalVolume > 0 ? ex.totalVolume.toLocaleString('pt-PT') : '-'}</span>
                  <span className="admin-ex-col">
                    <button
                      className="admin-ex-delete"
                      onClick={() => setConfirmAction({ type: 'delete', exerciseId: ex.id, name: ex.name })}
                      title="Eliminar"
                    >&#x2715;</button>
                  </span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button className="btn btn-ghost btn-sm" disabled={exPage <= 1} onClick={() => setExPage(exPage - 1)}>Anterior</button>
                <span className="text-xs text-muted">{exPage} / {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={exPage >= totalPages} onClick={() => setExPage(exPage + 1)}>Seguinte</button>
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'users' && (() => {
        const filtered = users.filter((u) => {
          if (userFilter === 'admin' && !u.isAdmin) return false;
          if (userFilter === 'suspended' && !u.isSuspended) return false;
          if (userFilter === 'active' && u.isSuspended) return false;
          if (userSearch && !u.name.toLowerCase().includes(userSearch.toLowerCase()) && !u.email.toLowerCase().includes(userSearch.toLowerCase())) return false;
          return true;
        });
        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        const paged = filtered.slice((userPage - 1) * PER_PAGE, userPage * PER_PAGE);

        return (
          <div className="admin-users-section">
            <div className="admin-filters">
              <input
                className="form-input"
                placeholder="Pesquisar nome ou email..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
              />
              <Dropdown
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'active', label: 'Ativos' },
                  { value: 'admin', label: 'Admins' },
                  { value: 'suspended', label: 'Suspensos' },
                ]}
                value={userFilter}
                onChange={(val) => { setUserFilter(val || 'all'); setUserPage(1); }}
                placeholder="Todos"
                showPlaceholder={false}
              />
            </div>

            <p className="text-xs text-muted">{filtered.length} utilizadores</p>
            <div className="admin-users-table">
              <div className="admin-users-table-head">
                <span className="admin-col-name">Nome</span>
                <span className="admin-col-email">Email</span>
                <span className="admin-col-date">Registado</span>
                <span className="admin-col-status">Estado</span>
              </div>
              {paged.map((u) => (
                <div
                  key={u.id}
                  className={`admin-users-table-row ${u.isSuspended ? 'admin-row-suspended' : ''}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <span className="admin-col-name">
                    {u.name}
                    {u.isAdmin && <span className="admin-role-tag admin-role-tag--admin">admin</span>}
                  </span>
                  <span className="admin-col-email text-muted">{u.email}</span>
                  <span className="admin-col-date text-muted">
                    {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                  </span>
                  <span className="admin-col-status">
                    {u.isSuspended
                      ? <span className="admin-status-tag admin-status-tag--suspended">suspensa</span>
                      : <span className="admin-status-tag admin-status-tag--active">ativa</span>
                    }
                  </span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button className="btn btn-ghost btn-sm" disabled={userPage <= 1} onClick={() => setUserPage(userPage - 1)}>Anterior</button>
                <span className="text-xs text-muted">{userPage} / {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={userPage >= totalPages} onClick={() => setUserPage(userPage + 1)}>Seguinte</button>
              </div>
            )}
          </div>
        );
      })()}

      {selectedUser && !confirmAction && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-user-detail" onClick={(e) => e.stopPropagation()}>
            <div className="admin-ud-header">
              <h3>{selectedUser.name}</h3>
              <button className="admin-ud-close" onClick={() => setSelectedUser(null)}>&#x2715;</button>
            </div>

            <div className="admin-ud-section">
              <div className="admin-ud-row">
                <span className="admin-ud-label">Email</span>
                <span className="admin-ud-value">{selectedUser.email}</span>
              </div>
              <div className="admin-ud-row">
                <span className="admin-ud-label">Conta</span>
                <span className="admin-ud-value">
                  {selectedUser.isAdmin ? 'Administrador' : 'Utilizador'}
                  {selectedUser.isSuspended && ' (suspensa)'}
                </span>
              </div>
              <div className="admin-ud-row">
                <span className="admin-ud-label">Registado</span>
                <span className="admin-ud-value">{new Date(selectedUser.createdAt).toLocaleDateString('pt-PT')}</span>
              </div>
            </div>

            <div className="admin-ud-section">
              <div className="admin-ud-row">
                <span className="admin-ud-label">Sessoes</span>
                <span className="admin-ud-value">{selectedUser.sessions}</span>
              </div>
              <div className="admin-ud-row">
                <span className="admin-ud-label">Exercicios criados</span>
                <span className="admin-ud-value">{selectedUser.customExercises}</span>
              </div>
              <div className="admin-ud-row">
                <span className="admin-ud-label">Planos</span>
                <span className="admin-ud-value">{selectedUser.plans}</span>
              </div>
              <div className="admin-ud-row">
                <span className="admin-ud-label">Volume total</span>
                <span className="admin-ud-value">{selectedUser.volume.toLocaleString('pt-PT')}</span>
              </div>
            </div>

            {selectedUser.id !== user.id && (
              <div className="admin-ud-footer">
                <button
                  className="admin-action-link"
                  onClick={() => setConfirmAction({ type: 'admin', userId: selectedUser.id, name: selectedUser.name, current: selectedUser.isAdmin })}
                >
                  {selectedUser.isAdmin ? 'Remover admin' : 'Tornar admin'}
                </button>
                <button
                  className="admin-action-link admin-action-link--danger"
                  onClick={() => setConfirmAction({ type: 'suspend', userId: selectedUser.id, name: selectedUser.name, current: selectedUser.isSuspended })}
                >
                  {selectedUser.isSuspended ? 'Reativar conta' : 'Suspender conta'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {confirmAction.type === 'delete' && 'Eliminar exercicio?'}
                {confirmAction.type === 'admin' && (confirmAction.current ? 'Remover admin?' : 'Tornar admin?')}
                {confirmAction.type === 'suspend' && (confirmAction.current ? 'Reativar conta?' : 'Suspender conta?')}
              </h3>
              <button className="btn-icon" onClick={() => setConfirmAction(null)} aria-label="Fechar">
                <span style={{ fontSize: '1rem' }}>&#x2715;</span>
              </button>
            </div>
            <p className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>
              {confirmAction.type === 'delete' && `Vais eliminar o exercicio "${confirmAction.name}". Esta acao nao pode ser revertida.`}
              {confirmAction.type === 'admin' && (confirmAction.current
                ? `Vais remover os privilegios de administrador de ${confirmAction.name}.`
                : `Vais conceder privilegios de administrador a ${confirmAction.name}.`)}
              {confirmAction.type === 'suspend' && (confirmAction.current
                ? `Vais reativar a conta de ${confirmAction.name}.`
                : `Vais suspender a conta de ${confirmAction.name}. Nao vai conseguir fazer login.`)}
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>Cancelar</button>
              <button
                className={`btn ${confirmAction.type === 'delete' || (confirmAction.type === 'suspend' && !confirmAction.current) ? 'btn-danger' : 'btn-primary'}`}
                onClick={executeAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'A processar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
