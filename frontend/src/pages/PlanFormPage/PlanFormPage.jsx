import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import api from '../../services/api';
import ExercisePicker from '../../components/ExercisePicker';
import './PlanFormPage.css';

const emptyEntry = (exercise, order) => ({
  exercise,
  exerciseId: exercise.id,
  sets: 3,
  reps: 10,
  weight: 0,
  order,
});

export default function PlanFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/plans/${id}`)
      .then((res) => {
        const plan = res.data;
        setName(plan.name);
        setDescription(plan.description || '');
        setExercises(plan.exercises.map((pe) => ({
          exercise: pe.exercise,
          exerciseId: pe.exercise.id,
          sets: pe.sets,
          reps: pe.reps,
          weight: pe.weight,
          order: pe.order,
        })));
      })
      .catch(() => navigate('/plans'))
      .finally(() => setFetching(false));
  }, [id, isEdit, navigate]);

  const addExercise = (exercise) => {
    if (exercises.find((e) => e.exerciseId === exercise.id)) { setShowPicker(false); return; }
    setExercises((prev) => [...prev, emptyEntry(exercise, prev.length)]);
    setShowPicker(false);
  };

  const removeExercise = (idx) =>
    setExercises((prev) => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, order: i })));

  const updateField = (idx, field, value) => {
    setExercises((prev) => {
      const u = [...prev];
      u[idx] = { ...u[idx], [field]: value };
      return u;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('O nome do plano é obrigatório.'); return; }
    if (exercises.length === 0) { setError('Adiciona pelo menos um exercício.'); return; }

    for (const ex of exercises) {
      if (!ex.sets || ex.sets < 1) { setError('As séries devem ser pelo menos 1.'); return; }
      if (!ex.reps || ex.reps < 1) { setError('As repetições devem ser pelo menos 1.'); return; }
      if (ex.weight < 0) { setError('O peso não pode ser negativo.'); return; }
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        exercises: exercises.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          sets: Number(ex.sets),
          reps: Number(ex.reps),
          weight: Number(ex.weight),
          order: i,
        })),
      };

      if (isEdit) {
        await api.put(`/plans/${id}`, payload);
      } else {
        await api.post('/plans', payload);
      }
      navigate('/plans');
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors?.length ? errors.map((e) => e.msg).join('. ') : err.response?.data?.message || 'Erro ao guardar plano.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEdit ? 'Editar Plano' : 'Novo Plano'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="plan-form">
        <div className="card">
          <div className="form-group">
            <label className="form-label">Nome do plano *</label>
            <input
              className="form-input"
              placeholder="Ex: Treino A - Peito e Tríceps"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group mt-3">
            <label className="form-label">Descrição (opcional)</label>
            <textarea
              className="form-textarea"
              placeholder="Notas ou objetivo deste plano..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="exercises-section">
          <div className="section-header">
            <h2>Exercícios</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowPicker(true)}>
              <FiPlus size={14} /> Adicionar
            </button>
          </div>

          {exercises.length === 0 && (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-icon"><FiPlus size={32} /></div>
              <p className="text-sm text-secondary">Adiciona exercícios ao plano</p>
            </div>
          )}

          {exercises.map((ex, idx) => (
            <div key={idx} className="card plan-ex-row">
              <div className="plan-ex-info">
                <span className="font-medium">{ex.exercise.name}</span>
                <span className="badge badge-primary text-xs">{ex.exercise.muscleGroup}</span>
              </div>
              <div className="plan-ex-fields">
                <div className="plan-ex-field">
                  <label>Séries</label>
                  <input
                    type="number"
                    className="form-input set-input"
                    value={ex.sets}
                    min={1}
                    onChange={(e) => updateField(idx, 'sets', e.target.value)}
                  />
                </div>
                <div className="plan-ex-field">
                  <label>Reps</label>
                  <input
                    type="number"
                    className="form-input set-input"
                    value={ex.reps}
                    min={1}
                    onChange={(e) => updateField(idx, 'reps', e.target.value)}
                  />
                </div>
                <div className="plan-ex-field">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    className="form-input set-input"
                    value={ex.weight}
                    min={0}
                    step={0.5}
                    onChange={(e) => updateField(idx, 'weight', e.target.value)}
                  />
                </div>
                <button type="button" className="btn-icon" onClick={() => removeExercise(idx)} aria-label="Remover">
                  <FiX size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/plans')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSave size={14} /> {loading ? 'A guardar...' : 'Guardar plano'}
          </button>
        </div>
      </form>

      {showPicker && (
        <ExercisePicker
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
          selectedIds={exercises.map((e) => e.exerciseId)}
        />
      )}
    </div>
  );
}
