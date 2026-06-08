import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiEdit2, FiChevronDown, FiChevronUp, FiPlay } from 'react-icons/fi';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import './PlansPage.css';

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get('/plans')
      .then((res) => setPlans(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/plans/${deleteId}`);
      setPlans((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleStart = (plan) => {
    navigate('/sessions/new', { state: { plan } });
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Planos de Treino</h1>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/plans/new')}>
          <FiPlus size={14} /> Novo Plano
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FiPlus size={40} /></div>
          <h3>Sem planos de treino</h3>
          <p className="text-secondary text-sm">Cria um plano com exercícios e séries predefinidos</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/plans/new')}>
            Criar primeiro plano
          </button>
        </div>
      ) : (
        <div className="plans-list">
          {plans.map((plan) => (
            <div key={plan.id} className="card plan-card">
              <div className="plan-card-header">
                <div className="plan-info">
                  <h3>{plan.name}</h3>
                  {plan.description && <p className="text-secondary text-sm">{plan.description}</p>}
                  <span className="text-xs text-muted">
                    {plan.exercises.length} exercício{plan.exercises.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="plan-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => handleStart(plan)} title="Iniciar treino">
                    <FiPlay size={13} /> Treinar
                  </button>
                  {!plan.isSystem && (
                    <>
                      <button className="btn-icon" onClick={() => navigate(`/plans/${plan.id}/edit`)} title="Editar">
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => setDeleteId(plan.id)}
                        disabled={deleting}
                        title="Eliminar"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </>
                  )}
                  <button className="btn-icon" onClick={() => toggleExpand(plan.id)} title="Ver exercícios">
                    {expanded[plan.id] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {expanded[plan.id] && (
                <div className="plan-exercises">
                  {plan.exercises.length === 0 ? (
                    <p className="text-secondary text-sm">Sem exercícios definidos</p>
                  ) : (
                    <table className="plan-ex-table">
                      <thead>
                        <tr>
                          <th>Exercício</th>
                          <th>Grupo</th>
                          <th>Séries</th>
                          <th>Reps</th>
                          <th>Peso (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.exercises.map((pe) => (
                          <tr key={pe.id}>
                            <td>{pe.exercise.name}</td>
                            <td><span className="badge badge-primary">{pe.exercise.muscleGroup}</span></td>
                            <td>{pe.sets}</td>
                            <td>{pe.reps}</td>
                            <td>{pe.weight > 0 ? pe.weight : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title="Eliminar plano?"
          message="Esta ação não pode ser desfeita."
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
