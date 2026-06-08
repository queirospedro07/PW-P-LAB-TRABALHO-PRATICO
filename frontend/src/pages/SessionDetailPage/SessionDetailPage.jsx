import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import api from '../../services/api';
import { formatDate } from '../../utils/date';
import ConfirmModal from '../../components/ConfirmModal';
import PageLoader from '../../components/PageLoader';
import './SessionDetailPage.css';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/sessions/${id}`)
      .then((r) => setSession(r.data))
      .catch(() => setError('Sessão não encontrada.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/sessions/${id}`); navigate('/sessions'); }
    catch { setError('Erro ao eliminar.'); setDeleting(false); }
  };

  if (loading) return <PageLoader />;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!session) return null;

  const calcVol = (sets) => sets.reduce((a, s) => a + (s.weight === 0 ? s.reps : s.weight * s.reps), 0).toFixed(1);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/sessions" className="back-link"><FiArrowLeft size={14} /> Sessões</Link>
          <h1 className="mt-1">{formatDate(session.date)}</h1>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>
          <FiTrash2 size={14} /> Eliminar
        </button>
      </div>

      {session.notes && <div className="card mb-4"><p className="text-sm text-secondary">{session.notes}</p></div>}

      <div className="summary-grid">
        <div className="summary-item"><span className="summary-val">{session.exercises?.length || 0}</span><span className="summary-lbl">Exercícios</span></div>
        <div className="summary-item"><span className="summary-val">{session.exercises?.reduce((a, e) => a + e.sets.length, 0) || 0}</span><span className="summary-lbl">Séries</span></div>
        <div className="summary-item"><span className="summary-val">{session.totalVolume || 0}</span><span className="summary-lbl">Volume</span></div>
      </div>

      <div className="detail-list mt-4">
        {session.exercises?.map((ex, i) => {
          const isCardio = ex.exercise?.muscleGroup === 'cardio';
          return (
          <div key={i} className="card detail-card">
            <div className="detail-card-header">
              <div>
                <h3>{ex.exercise?.name}</h3>
                <span className="badge badge-primary">{ex.exercise?.muscleGroup}</span>
              </div>
              <span className="text-sm text-primary font-medium">{calcVol(ex.sets)} {isCardio ? 'km' : 'vol'}</span>
            </div>
            <div className="sets-table">
              <div className="sets-table-head"><span>#</span><span>{isCardio ? 'Km' : 'Peso'}</span><span>{isCardio ? 'Min' : 'Reps'}</span><span>{isCardio ? 'Ritmo' : 'Vol'}</span></div>
              {ex.sets.map((s, j) => (
                <div key={j} className="sets-table-row">
                  <span className="text-muted">{j + 1}</span>
                  <span>{isCardio ? `${s.weight} km` : s.weight > 0 ? `${s.weight} kg` : 'PC'}</span>
                  <span>{s.reps} {isCardio ? 'min' : ''}</span>
                  <span className="text-muted">{isCardio ? (s.weight > 0 ? `${(s.reps / s.weight).toFixed(1)} min/km` : '—') : (s.weight === 0 ? s.reps : (s.weight * s.reps).toFixed(0))}</span>
                </div>
              ))}
            </div>
            <Link to={`/exercises/${ex.exercise?.id || ex.exercise?._id}/history`} className="btn btn-ghost btn-sm mt-2">
              <FiTrendingUp size={12} /> Evolução
            </Link>
          </div>
          );
        })}
      </div>

      {showDelete && (
        <ConfirmModal
          title="Eliminar sessão?"
          message="Esta ação não pode ser desfeita."
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
