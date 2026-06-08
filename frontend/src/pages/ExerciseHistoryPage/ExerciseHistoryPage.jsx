import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FiArrowLeft, FiAward, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import api from '../../services/api';
import { formatDate, formatShortDate } from '../../utils/date';
import Pagination from '../../components/Pagination';
import PageLoader from '../../components/PageLoader';
import './ExerciseHistoryPage.css';

const PERIODS = [
  { label: '1 mês', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: 'Tudo', days: null },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="font-medium">{formatDate(d.date)}</p>
        <p>Peso: <strong>{d.maxWeight} kg</strong></p>
        <p>Volume: <strong>{d.volume}</strong></p>
      </div>
    );
  }
  return null;
};

export default function ExerciseHistoryPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = {};
        if (period) { const s = new Date(); s.setDate(s.getDate() - period); params.startDate = s.toISOString().split('T')[0]; }
        const r = await api.get(`/stats/exercises/${id}/history`, { params });
        setData(r.data);
      } catch (err) { setError(err.response?.status === 404 ? 'Exercício não encontrado.' : 'Erro ao carregar.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, period]);

  useEffect(() => { setHistoryPage(1); }, [period]);

  if (loading) return <PageLoader />;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!data) return null;

  const { exercise, history, maxWeight } = data;
  const chartData = history.map((h) => ({ ...h, label: formatShortDate(h.date) }));
  const isCardio = exercise.muscleGroup === 'cardio';

  const LIMIT = 4;
  const reversed = [...history].reverse();
  const totalPages = Math.ceil(reversed.length / LIMIT);
  const paged = reversed.slice((historyPage - 1) * LIMIT, historyPage * LIMIT);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/exercises" className="back-link"><FiArrowLeft size={14} /> Exercícios</Link>
          <h1 className="mt-1">{exercise.name}</h1>
          <span className="badge badge-primary">{exercise.muscleGroup}</span>
        </div>
      </div>

      <div className="history-stats">
        <div className="stat-card"><FiAward size={16} className="stat-icon" /><div className="stat-value">{maxWeight} {isCardio ? 'km' : 'kg'}</div><div className="stat-label">{isCardio ? 'Distância máx.' : 'Peso máximo'}</div></div>
        <div className="stat-card"><FiCalendar size={16} className="stat-icon" /><div className="stat-value">{history.length}</div><div className="stat-label">Sessões</div></div>
        {history.length > 1 && (
          <div className="stat-card"><FiTrendingUp size={16} className="stat-icon" /><div className="stat-value">+{(history[history.length - 1].maxWeight - history[0].maxWeight).toFixed(1)}</div><div className="stat-label">Evolução ({isCardio ? 'km' : 'kg'})</div></div>
        )}
      </div>

      <div className="period-filter">
        {PERIODS.map((p) => (
          <button key={p.label} className={`btn btn-sm ${period === p.days ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod(p.days)}>{p.label}</button>
        ))}
      </div>

      <div className="card mt-3">
        <h3 className="mb-3">Evolução do peso</h3>
        {history.length < 2 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-icon"><FiTrendingUp size={28} /></div>
            <p className="text-sm text-secondary">Necessários pelo menos 2 registos para o gráfico.</p>
          </div>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10, fontFamily: 'Lexend' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10, fontFamily: 'Lexend' }} tickLine={false} axisLine={false} unit=" kg" />
                <Tooltip content={<CustomTooltip />} />
                {maxWeight > 0 && <ReferenceLine y={maxWeight} stroke="#f59e0b" strokeDasharray="4 4" />}
                <Line type="monotone" dataKey="maxWeight" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#a78bfa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="card mt-4">
          <div className="section-header">
            <h3>Histórico</h3>
            <span className="text-xs text-muted">{history.length} registo(s)</span>
          </div>
          <div className="history-list">
            {paged.map((h, i) => (
              <div key={i} className="history-item">
                <div className="history-item-header">
                  <span className="font-medium text-sm">{formatDate(h.date)}</span>
                  <div className="history-item-stats">
                    <span className="badge badge-primary">{h.maxWeight} {isCardio ? 'km' : 'kg'}</span>
                    <span className="text-xs text-muted">{h.volume} {isCardio ? 'min' : 'vol'}</span>
                  </div>
                </div>
                <div className="sets-chips mt-1">
                  {h.sets?.map((s, j) => (
                    <span key={j} className="set-chip">
                      {isCardio ? `${s.weight}km · ${s.reps}min` : `${s.weight > 0 ? `${s.weight}kg` : 'PC'} × ${s.reps}`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Pagination page={historyPage} totalPages={totalPages} onChange={setHistoryPage} />
        </div>
      )}
    </div>
  );
}
