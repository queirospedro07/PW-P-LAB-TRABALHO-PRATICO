import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiEye, FiFilter } from 'react-icons/fi';
import api from '../../services/api';
import { formatDate } from '../../utils/date';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import PageLoader from '../../components/PageLoader';
import './SessionsPage.css';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 9;

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/sessions', { params });
      setSessions(res.data.sessions);
      setTotal(res.data.total);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); }, [page, startDate, endDate]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/sessions/${deleteId}`);
      setSessions((p) => p.filter((s) => (s._id || s.id) !== deleteId));
      setTotal((t) => t - 1);
      setDeleteId(null);
    } catch { }
    finally { setDeleting(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sessões</h1>
        <Link to="/sessions/new" className="btn btn-primary hide-mobile"><FiPlus size={14} /> Nova</Link>
      </div>

      <div className="card filters-card mb-4">
        <div className="filters-row">
          <div className="form-group">
            <label className="form-label">De</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div className="form-group">
            <label className="form-label">Até</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          </div>
          {(startDate || endDate) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}>Limpar</button>
          )}
        </div>
      </div>

      {loading ? <PageLoader /> :
      sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FiFilter size={32} /></div>
          <h3>Nenhuma sessão</h3>
          <Link to="/sessions/new" className="btn btn-primary mt-4"><FiPlus size={14} /> Nova Sessão</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted mb-3">{total} sessão(ões)</p>
          <div className="sessions-list">
            {sessions.map((session) => {
              const sid = session._id || session.id;
              return (
                <div key={sid} className="card session-card">
                  <div className="session-row" onClick={() => setExpanded(expanded === sid ? null : sid)}>
                    <div className="session-info">
                      <span className="session-date">{formatDate(session.date)}</span>
                      <div className="session-meta">
                        <span>{session.exercises?.length || 0} exercício(s)</span>
                        {session.totalVolume > 0 && <span>{session.totalVolume} vol</span>}
                      </div>
                    </div>
                    <div className="session-actions">
                      <Link to={`/sessions/${sid}`} className="btn-icon" onClick={(e) => e.stopPropagation()} aria-label="Ver"><FiEye size={15} /></Link>
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setDeleteId(sid); }} aria-label="Eliminar"><FiTrash2 size={15} /></button>
                      {expanded === sid ? <FiChevronUp size={14} className="text-muted" /> : <FiChevronDown size={14} className="text-muted" />}
                    </div>
                  </div>

                  {expanded === sid && (
                    <div className="session-detail">
                      <hr className="divider" />
                      {session.exercises?.map((ex, i) => {
                        const isCardio = ex.exercise?.muscleGroup === 'cardio';
                        return (
                        <div key={i} className="detail-exercise">
                          <div className="detail-ex-header">
                            <span className="font-medium text-sm">{ex.exercise?.name || 'Exercício'}</span>
                            <span className="badge badge-primary">{ex.exercise?.muscleGroup}</span>
                          </div>
                          <div className="sets-chips">
                            {ex.sets?.map((s, j) => (
                              <span key={j} className="set-chip">
                                {isCardio ? `${s.weight}km · ${s.reps}min` : `${s.weight > 0 ? `${s.weight}kg` : 'PC'} × ${s.reps}`}
                              </span>
                            ))}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {deleteId && (
        <ConfirmModal
          title="Eliminar sessão?"
          message="Esta ação não pode ser desfeita."
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
