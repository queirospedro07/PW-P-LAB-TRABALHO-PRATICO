import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiCalendar, FiAward, FiActivity, FiChevronLeft, FiChevronRight, FiZap, FiTrendingUp, FiWind } from 'react-icons/fi';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/date';
import Dropdown from '../../components/Dropdown';
import './DashboardPage.css';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatRange = (start) => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sDay = start.getDate();
  const eDay = end.getDate();
  const sMonth = start.toLocaleDateString('pt-PT', { month: 'long' });
  const eMonth = end.toLocaleDateString('pt-PT', { month: 'long' });
  const year = start.getFullYear();
  if (sMonth === eMonth) return `${sDay} – ${eDay} de ${sMonth} ${year}`;
  return `${sDay} de ${sMonth} – ${eDay} de ${eMonth} ${year}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topSort, setTopSort] = useState('volume');
  const [topTimeframe, setTopTimeframe] = useState('week');
  const [topExercises, setTopExercises] = useState([]);
  const [topLoading, setTopLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekSessions, setWeekSessions] = useState([]);
  const [weekLoading, setWeekLoading] = useState(false);

  const currentWeekStart = getWeekStart(new Date());
  const viewedWeekStart = new Date(currentWeekStart);
  viewedWeekStart.setDate(viewedWeekStart.getDate() + weekOffset * 7);

  const fetchDashboard = async (sortBy = 'volume', timeframe = 'week') => {
    try {
      setTopLoading(true);
      const res = await api.get('/stats/dashboard', { params: { sortBy, timeframe } });
      setDashboard(res.data);
      setTopExercises(res.data.topExercises || []);
    } catch { }
    finally { setLoading(false); setTopLoading(false); }
  };

  useEffect(() => { fetchDashboard(topSort, topTimeframe); }, [topSort, topTimeframe]);

  useEffect(() => {
    api.get('/stats/overview').then((res) => setOverview(res.data)).catch(() => {});
    api.get('/stats/leaderboard').then((res) => setLeaderboard(res.data)).catch(() => {});
  }, []);

  const [userStats, setUserStats] = useState(null);
  useEffect(() => {
    Promise.all([
      api.get('/exercises').then((r) => r.data.filter((e) => !e.isSystem).length).catch(() => 0),
      api.get('/sessions', { params: { limit: 1 } }).then((r) => r.data.total).catch(() => 0),
      api.get('/plans').then((r) => r.data.length).catch(() => 0),
    ]).then(([exercises, sessions, plans]) => setUserStats({ exercises, sessions, plans }));
  }, []);

  useEffect(() => {
    const fetchWeek = async () => {
      setWeekLoading(true);
      try {
        const start = viewedWeekStart.toISOString().split('T')[0];
        const end = new Date(viewedWeekStart);
        end.setDate(end.getDate() + 6);
        const endStr = end.toISOString().split('T')[0];
        const res = await api.get('/sessions', { params: { startDate: start, endDate: endStr, limit: 50 } });

        const dayMap = [0, 0, 0, 0, 0, 0, 0];
        for (const s of res.data.sessions) {
          const d = new Date(s.date);
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          dayMap[dayIdx]++;
        }
        setWeekSessions(dayMap);
      } catch { setWeekSessions([0, 0, 0, 0, 0, 0, 0]); }
      finally { setWeekLoading(false); }
    };
    fetchWeek();
  }, [weekOffset]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const hasData = dashboard?.lastSession !== null;
  const isCurrentWeek = weekOffset === 0;
  const weekTotal = weekSessions.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(...weekSessions, 1);

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          Olá,{' '}
          {user?.name?.split(' ')[0]}
        </h1>
        <Link to="/sessions/new" className="btn btn-primary hide-mobile">
          <FiPlus size={16} /> Nova Sessão
        </Link>
      </div>

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-icon"><FiActivity size={40} /></div>
          <h3>Sem treinos registados</h3>
          <p className="text-sm text-secondary">Começa a registar os teus treinos</p>
          <Link to="/sessions/new" className="btn btn-primary mt-4">
            <FiPlus size={16} /> Primeiro treino
          </Link>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <FiCalendar size={18} className="stat-icon" />
              <div className="stat-value">{dashboard.weekSessions}</div>
              <div className="stat-label">Esta semana</div>
            </div>
            {dashboard.topExercises?.[0] && (
              <div className="stat-card">
                <FiAward size={18} className="stat-icon" />
                <div className="stat-value stat-value-sm">{dashboard.topExercises[0].name}</div>
                <div className="stat-label">Top exercício</div>
              </div>
            )}
          </div>

          {dashboard.lastSession && (
            <div className="card mt-4">
              <div className="section-header">
                <h3>Último treino</h3>
                <span className="text-sm text-secondary">{formatDate(dashboard.lastSession.date)}</span>
              </div>
              <div className="last-exercises">
                {dashboard.lastSession.exercises.map((ex, i) => (
                  <div key={i} className="last-ex-row">
                    <span>{ex.name}</span>
                    <span className="badge badge-primary">{ex.sets} séries</span>
                  </div>
                ))}
              </div>
            </div>
          )}

         


          <div className="week-card">
            <div className="week-nav">
              <button className="btn-icon" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Semana anterior">
                <FiChevronLeft size={18} />
              </button>
              <div className="week-nav-center">
                <span className="week-nav-title">{formatRange(viewedWeekStart)}</span>
                <span className="week-nav-total">{weekTotal} treino{weekTotal !== 1 ? 's' : ''}</span>
              </div>
              <button
                className="btn-icon"
                onClick={() => setWeekOffset((o) => o + 1)}
                disabled={isCurrentWeek}
                aria-label="Próxima semana"
              >
                <FiChevronRight size={18} />
              </button>
            </div>

            {weekLoading ? (
              <div className="loading-center" style={{ padding: '1.5rem' }}><div className="spinner" /></div>
            ) : (
              <div className="week-chart">
                {DAYS.map((day, i) => {
                  const count = weekSessions[i];
                  const dayDate = new Date(viewedWeekStart);
                  dayDate.setDate(dayDate.getDate() + i);
                  const isToday = dayDate.toDateString() === new Date().toDateString();
                  const hasSession = count > 0;
                  const isFuture = dayDate > new Date();
                  const pct = maxDay > 0 ? (count / maxDay) * 100 : 0;

                  return (
                    <div key={i} className={`week-day ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}`}>
                      <span className="week-bar-count">{hasSession ? count : ''}</span>
                      <div className="week-bar-wrap">
                        <div
                          className={`week-bar ${hasSession ? 'active' : ''}`}
                          style={{ height: `${hasSession ? Math.max(pct, 20) : 0}%` }}
                        />
                      </div>
                      <span className="week-day-label">{day}</span>
                      <span className="week-day-date">{dayDate.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {!isCurrentWeek && (
              <button className="btn btn-ghost btn-sm week-today-btn" onClick={() => setWeekOffset(0)}>
                Voltar a esta semana
              </button>
            )}
          </div>

          {dashboard.topExercises !== undefined && (
            <div className="card mt-4">
              <div className="section-header">
                <h3>Top exercícios</h3>                <Dropdown
                  options={[
                    { value: 'week',  label: 'Esta semana' },
                    { value: 'month', label: 'Este mês' },
                    { value: 'year',  label: 'Este ano' },
                    { value: 'all',   label: 'Sempre' },
                  ]}
                  value={topTimeframe}
                  onChange={setTopTimeframe}
                  showPlaceholder={false}
                />
              </div>
              <div className="top-tabs">
                {[
                  { key: 'volume', label: 'Volume' },
                  { key: 'reps', label: 'Reps' },
                  { key: 'weight', label: 'Peso' },
                  { key: 'count', label: 'Frequência' },
                  { key: 'cardio', label: 'Cardio' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`top-tab ${topSort === tab.key ? 'active' : ''}`}
                    onClick={() => setTopSort(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {topLoading ? (
                <div className="loading-center" style={{ padding: '1rem' }}><div className="spinner" /></div>
              ) : topExercises.length > 0 ? (
                <div className="top-list">
                  {topExercises.map((ex, i) => (
                    <div key={i} className="top-item">
                      <span className="top-rank">{i + 1}</span>
                      <span className="top-name">{ex.name}</span>
                      <span className="top-value">{ex.value} <small>{ex.unit}</small></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
                  Sem dados para este período.
                </p>
              )}
            </div>
          )}

          {(overview || userStats) && (
            <div className="card mt-4">
              <p className="text-xs text-muted overview-heading">Estatísticas</p>
              <div className="overview-row">
                {overview && (
                  <>
                    <div className="overview-stat">
                      <span className="overview-num">{overview.totalUsers}</span>
                      <span className="text-xs text-muted">utilizadores</span>
                    </div>
                    <div className="overview-sep" />
                  </>
                )}
                {userStats && (
                  <>
                    <div className="overview-stat">
                      <span className="overview-num">{userStats.exercises}</span>
                      <span className="text-xs text-muted">exercícios</span>
                    </div>
                    <div className="overview-sep" />
                    <div className="overview-stat">
                      <span className="overview-num">{userStats.sessions}</span>
                      <span className="text-xs text-muted">sessões</span>
                    </div>
                    <div className="overview-sep" />
                    <div className="overview-stat">
                      <span className="overview-num">{userStats.plans}</span>
                      <span className="text-xs text-muted">planos</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {leaderboard && (
            <div className="card mt-4">
              <p className="text-xs text-muted overview-heading">Leaderboard</p>
              <div className="lb-grid">
                {[
                  { key: 'volume',   label: 'Volume',   unit: 'vol', icon: FiZap       },
                  { key: 'sessions', label: 'Sessões',  unit: '',    icon: FiCalendar  },
                  { key: 'weight',   label: 'Peso máx', unit: 'kg',  icon: FiTrendingUp},
                  { key: 'cardio',   label: 'Cardio',   unit: 'km',  icon: FiWind      },
                ].map(({ key, label, unit, icon: Icon }) => {
                  const rows = leaderboard[key] || [];
                  return (
                    <div key={key} className="lb-cat">
                      <div className="lb-cat-header">
                        <Icon size={12} />
                        <span>{label}</span>
                      </div>
                      {rows.length === 0 ? (
                        <p className="lb-empty">—</p>
                      ) : rows.map((e, i) => (
                        <div key={i} className={`lb-entry ${i === 0 ? 'lb-entry-top' : ''}`}>
                          <span className="lb-pos">{i + 1}</span>
                          <span className="lb-username">{e.name}</span>
                          <span className="lb-score">{e.value.toLocaleString('pt-PT')}{unit && <small> {unit}</small>}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
