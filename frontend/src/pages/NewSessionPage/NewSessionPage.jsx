import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiPlus, FiTrash2, FiX, FiClipboard, FiChevronRight, FiPlay, FiSave, FiBookOpen } from 'react-icons/fi';
import api from '../../services/api';
import ExercisePicker from '../../components/ExercisePicker';
import './NewSessionPage.css';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const emptySet = () => ({ reps: '', weight: '' });

const planToExercises = (plan) =>
  plan.exercises.map((pe, i) => ({
    exercise: pe.exercise,
    order: i,
    sets: Array.from({ length: pe.sets }, () => ({
      reps: String(pe.reps),
      weight: String(pe.weight),
    })),
  }));

function ModeModal({ onSelectLog, onSelectLive, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Nova Sessão</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar"><FiX size={18} /></button>
        </div>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
          O que queres fazer?
        </p>
        <div className="session-type-list">
          <button className="session-type-option" onClick={onSelectLive}>
            <div className="session-type-info">
              <span className="font-medium">Treinar agora</span>
              <span className="text-xs text-muted">Começo o treino e confirmo as séries à medida que faço</span>
            </div>
            <FiPlay size={16} className="text-muted" />
          </button>
          <button className="session-type-option" onClick={onSelectLog}>
            <div className="session-type-info">
              <span className="font-medium">Registar treino passado</span>
              <span className="text-xs text-muted">Já treinei e quero adicionar o registo</span>
            </div>
            <FiSave size={16} className="text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanModal({ plans, onSelectCustom, onSelectPlan, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Escolher exercícios</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar"><FiX size={18} /></button>
        </div>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
          Usa um plano ou escolhe os exercícios manualmente.
        </p>
        <div className="session-type-list">
          <button className="session-type-option" onClick={onSelectCustom}>
            <div className="session-type-info">
              <span className="font-medium">Personalizado</span>
              <span className="text-xs text-muted">Escolho os exercícios manualmente</span>
            </div>
            <FiChevronRight size={16} className="text-muted" />
          </button>
          {plans.length > 0 && (
            <>
              <div className="session-type-divider">ou escolhe um plano</div>
              {plans.map((plan) => (
                <button key={plan.id} className="session-type-option" onClick={() => onSelectPlan(plan)}>
                  <div className="session-type-info">
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-xs text-muted">
                      {plan.exercises.length} exercício{plan.exercises.length !== 1 ? 's' : ''}
                      {plan.description ? ` · ${plan.description}` : ''}
                    </span>
                  </div>
                  <FiBookOpen size={16} className="text-muted" />
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const planFromNav = location.state?.plan || null;
  const modeFromNav = location.state?.mode || null;

  // Modes: 'pick-mode' → 'pick-plan' → 'form'
  const [step, setStep] = useState(() => {
    if (planFromNav) return 'form';
    if (modeFromNav) return 'pick-plan';
    return 'pick-mode';
  });
  const [sessionMode, setSessionMode] = useState(modeFromNav || (planFromNav ? 'live' : null)); // 'log' or 'live'
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(!planFromNav);

  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState(() => planFromNav ? planToExercises(planFromNav) : []);
  const [planName, setPlanName] = useState(planFromNav?.name || null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [maxWeights, setMaxWeights] = useState({});

  useEffect(() => {
    if (planFromNav) return;
    api.get('/plans')
      .then((res) => setPlans(res.data))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const handleSelectMode = (mode) => {
    setSessionMode(mode);
    setStep('pick-plan');
  };

  const handleSelectCustom = () => setStep('form');
  const handleSelectPlan = (plan) => {
    setExercises(planToExercises(plan));
    setPlanName(plan.name);
    setStep('form');
  };

  const fetchMaxWeight = useCallback(async (exerciseId) => {
    if (maxWeights[exerciseId] !== undefined) return;
    try {
      const res = await api.get(`/stats/exercises/${exerciseId}/history`);
      const history = res.data.history || [];
      const lastSession = history.length > 0 ? history[history.length - 1] : null;
      const lastWeight = lastSession ? lastSession.sets[0]?.weight || 0 : 0;
      setMaxWeights((prev) => ({ ...prev, [exerciseId]: { max: res.data.maxWeight || 0, last: lastWeight } }));
    } catch { setMaxWeights((prev) => ({ ...prev, [exerciseId]: { max: 0, last: 0 } })); }
  }, [maxWeights]);

  const addExercise = (exercise) => {
    if (exercises.find((e) => e.exercise.id === exercise.id)) { setShowPicker(false); return; }
    const cached = maxWeights[exercise.id];
    const defaultWeight = cached?.last || 0;
    setExercises((prev) => [...prev, {
      exercise,
      sets: [{ reps: '', weight: defaultWeight > 0 ? String(defaultWeight) : '' }],
      order: prev.length,
    }]);
    fetchMaxWeight(exercise.id);
    setShowPicker(false);
  };

  const removeExercise = (idx) => setExercises((prev) => prev.filter((_, i) => i !== idx));

  const addSet = (exIdx) => {
    setExercises((prev) => {
      const u = [...prev];
      const lastSet = u[exIdx].sets[u[exIdx].sets.length - 1];
      const newSet = { reps: lastSet?.reps || '', weight: lastSet?.weight || '' };
      u[exIdx] = { ...u[exIdx], sets: [...u[exIdx].sets, newSet] };
      return u;
    });
  };

  const removeSet = (exIdx, setIdx) => {
    setExercises((prev) => {
      const u = [...prev];
      const newSets = u[exIdx].sets.filter((_, i) => i !== setIdx);
      if (newSets.length === 0) return prev;
      u[exIdx] = { ...u[exIdx], sets: newSets };
      return u;
    });
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setExercises((prev) => {
      const u = [...prev];
      const newSets = [...u[exIdx].sets];
      newSets[setIdx] = { ...newSets[setIdx], [field]: value };
      u[exIdx] = { ...u[exIdx], sets: newSets };
      return u;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (exercises.length === 0) { setError('Adiciona pelo menos um exercício.'); return; }
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (!s.reps || Number(s.reps) < 1) { setError('Todas as séries devem ter pelo menos 1 repetição.'); return; }
        if (s.weight !== '' && Number(s.weight) < 0) { setError('O peso não pode ser negativo.'); return; }
      }
    }
    setLoading(true);

    const isLive = sessionMode === 'live';

    try {
      const payload = {
        date,
        notes,
        status: isLive ? 'in_progress' : 'completed',
        exercises: exercises.map((ex, i) => ({
          exercise: ex.exercise.id,
          order: i,
          sets: ex.sets.map((s, j) => ({
            reps: Number(s.reps),
            weight: s.weight === '' ? 0 : Number(s.weight),
            order: j,
            completed: !isLive,
          })),
        })),
      };
      const res = await api.post('/sessions', payload);
      const sid = res.data._id || res.data.id;

      if (isLive) {
        navigate(`/sessions/${sid}/live`);
      } else {
        navigate(`/sessions/${sid}`);
      }
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors?.length ? errors.map((e) => e.msg).join('. ') : err.response?.data?.message || 'Erro ao criar sessão.');
    } finally { setLoading(false); }
  };

  // Step 1: pick mode
  if (step === 'pick-mode') {
    return (
      <ModeModal
        onSelectLog={() => handleSelectMode('log')}
        onSelectLive={() => handleSelectMode('live')}
        onClose={() => navigate(-1)}
      />
    );
  }

  // Step 2: pick plan/custom
  if (step === 'pick-plan') {
    if (plansLoading) return <div className="loading-center"><div className="spinner" /></div>;
    return (
      <PlanModal
        plans={plans}
        onSelectCustom={handleSelectCustom}
        onSelectPlan={handleSelectPlan}
        onClose={() => setStep('pick-mode')}
      />
    );
  }

  // Step 3: form
  const isLive = sessionMode === 'live';

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isLive ? 'Preparar Treino' : 'Registar Treino'}</h1>
      </div>

      {planName && (
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiClipboard size={14} />
          Plano: <strong>{planName}</strong>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="session-form">
        <div className="card">
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Data</label>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="form-group mt-3">
            <label className="form-label">Notas (opcional)</label>
            <textarea className="form-textarea" placeholder="Observações sobre o treino..." value={notes} onChange={(e) => setNotes(e.target.value)} />
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
              <p className="text-sm text-secondary">Adiciona exercícios à sessão</p>
            </div>
          )}

          {exercises.map((ex, exIdx) => {
            const isCardio = ex.exercise.muscleGroup === 'cardio';
            return (
            <div key={exIdx} className="card exercise-card">
              <div className="ex-card-header">
                <div>
                  <h3>{ex.exercise.name}</h3>
                  <div className="ex-meta">
                    <span className="badge badge-primary">{ex.exercise.muscleGroup}</span>
                    {!isCardio && maxWeights[ex.exercise.id]?.max > 0 && (
                      <span className="text-xs text-secondary">Máx: {maxWeights[ex.exercise.id].max} kg</span>
                    )}
                  </div>
                </div>
                <button type="button" className="btn-icon" onClick={() => removeExercise(exIdx)} aria-label="Remover">
                  <FiTrash2 size={16} />
                </button>
              </div>

              <div className="sets-grid sets-header-row">
                <span>#</span><span>{isCardio ? 'Km' : 'Peso (kg)'}</span><span>{isCardio ? 'Min' : 'Reps'}</span><span></span>
              </div>

              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className="sets-grid">
                  <span className="set-num">{setIdx + 1}</span>
                  <input type="number" className="form-input set-input" placeholder="0" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} min="0" step={isCardio ? '0.1' : '0.5'} inputMode="decimal" />
                  <input type="number" className="form-input set-input" placeholder="0" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} min="1" step="1" inputMode="numeric" />
                  <button type="button" className="btn-icon" onClick={() => removeSet(exIdx, setIdx)} disabled={ex.sets.length === 1} aria-label="Remover série">
                    <FiX size={14} />
                  </button>
                </div>
              ))}

              <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => addSet(exIdx)}>
                <FiPlus size={12} /> {isCardio ? 'Entrada' : 'Série'}
              </button>
            </div>
            );
          })}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {isLive ? <FiPlay size={14} /> : <FiSave size={14} />}
            {loading ? 'A guardar...' : isLive ? 'Começar Treino' : 'Guardar'}
          </button>
        </div>
      </form>

      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} selectedIds={exercises.map((e) => e.exercise.id)} />}
    </div>
  );
}
