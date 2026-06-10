import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiPlus, FiTrash2, FiFlag, FiX } from 'react-icons/fi';
import api from '../../services/api';
import ExercisePicker from '../../components/ExercisePicker';
import ConfirmModal from '../../components/ConfirmModal';
import PageLoader from '../../components/PageLoader';
import './LiveWorkoutPage.css';

function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div className="live-timer">
      <span className="live-timer-dot" />
      {display}
    </div>
  );
}

export default function LiveWorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [startTime] = useState(() => Date.now());
  const debounceTimers = useRef({});

  useEffect(() => {
    api.get(`/sessions/${id}`)
      .then((r) => {
        if (r.data.status === 'completed') {
          navigate(`/sessions/${id}`, { replace: true });
          return;
        }
        setSession(r.data);
      })
      .catch(() => setError('Sessão não encontrada.'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const toggleSet = useCallback(async (setId, currentCompleted) => {
    const newCompleted = !currentCompleted;
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => s._id === setId ? { ...s, completed: newCompleted } : s),
      })),
    }));
    try {
      await api.patch(`/sessions/sets/${setId}/toggle`, { completed: newCompleted });
    } catch {
      setSession((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => s._id === setId ? { ...s, completed: currentCompleted } : s),
        })),
      }));
    }
  }, []);

  const updateSetValue = useCallback((setId, field, value) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => s._id === setId ? { ...s, [field]: value } : s),
      })),
    }));
    const key = `${setId}-${field}`;
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(async () => {
      try {
        await api.patch(`/sessions/sets/${setId}`, { [field]: Number(value) || 0 });
      } catch { /* silent */ }
    }, 500);
  }, []);

  const addExercise = async (exercise) => {
    setShowPicker(false);
    if (session.exercises.find((e) => e.exercise.id === exercise.id)) return;
    try {
      const newExercises = [
        ...session.exercises.map((ex) => ({
          exercise: ex.exercise.id,
          order: ex.order,
          sets: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight, completed: s.completed })),
        })),
        { exercise: exercise.id, order: session.exercises.length, sets: [{ reps: 10, weight: 0, completed: false }] },
      ];
      const res = await api.put(`/sessions/${id}`, { exercises: newExercises });
      setSession(res.data);
    } catch { setError('Erro ao adicionar exercício.'); }
  };

  const removeExercise = async (exIdx) => {
    const newExercises = session.exercises
      .filter((_, i) => i !== exIdx)
      .map((ex, i) => ({
        exercise: ex.exercise.id,
        order: i,
        sets: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight, completed: s.completed })),
      }));
    try {
      const res = await api.put(`/sessions/${id}`, { exercises: newExercises });
      setSession(res.data);
    } catch { setError('Erro ao remover exercício.'); }
  };

  const addSet = async (exIdx) => {
    const targetEx = session.exercises[exIdx];
    const lastSet = targetEx.sets[targetEx.sets.length - 1];
    const newExercises = session.exercises.map((ex, i) => ({
      exercise: ex.exercise.id,
      order: i,
      sets: [
        ...ex.sets.map((s) => ({ reps: s.reps, weight: s.weight, completed: s.completed })),
        ...(i === exIdx ? [{ reps: lastSet?.reps || 10, weight: lastSet?.weight || 0, completed: false }] : []),
      ],
    }));
    try {
      const res = await api.put(`/sessions/${id}`, { exercises: newExercises });
      setSession(res.data);
    } catch { setError('Erro ao adicionar série.'); }
  };

  const removeSet = async (exIdx, setIdx) => {
    const targetEx = session.exercises[exIdx];
    if (targetEx.sets.length <= 1) return;
    const newExercises = session.exercises.map((ex, i) => ({
      exercise: ex.exercise.id,
      order: i,
      sets: i === exIdx
        ? ex.sets.filter((_, j) => j !== setIdx).map((s) => ({ reps: s.reps, weight: s.weight, completed: s.completed }))
        : ex.sets.map((s) => ({ reps: s.reps, weight: s.weight, completed: s.completed })),
    }));
    try {
      const res = await api.put(`/sessions/${id}`, { exercises: newExercises });
      setSession(res.data);
    } catch { setError('Erro ao remover série.'); }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await api.patch(`/sessions/${id}/complete`);
      navigate(`/sessions/${id}`);
    } catch { setError('Erro ao concluir treino.'); }
    finally { setFinishing(false); }
  };

  const handleCancel = async () => {
    try {
      await api.delete(`/sessions/${id}`);
      navigate('/sessions');
    } catch { setError('Erro ao cancelar.'); }
  };

  if (loading) return <PageLoader />;
  if (error && !session) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!session) return null;

  const allSets = session.exercises.flatMap((ex) => ex.sets);
  const completedSets = allSets.filter((s) => s.completed);
  const progress = allSets.length > 0 ? (completedSets.length / allSets.length) * 100 : 0;
  const totalVolume = completedSets.reduce((acc, s) => {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps, 10) || 0;
    return acc + (w === 0 ? r : w * r);
  }, 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Treino em Curso</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCancel(true)}>
          <FiX size={14} /> Cancelar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="live-workout">
        {/* Info bar */}
        <div className="live-info-bar">
          <div className="live-info-left">
            <Timer startTime={startTime} />
            <span className="live-progress-pill">
              <strong>{completedSets.length}</strong>/{allSets.length} séries
            </span>
          </div>
          <span className="live-progress-pill">
            <strong>{totalVolume.toLocaleString('pt-PT')}</strong> vol
          </span>
        </div>

        {/* Progress bar */}
        <div className="live-progress-bar">
          <div className="live-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Exercises */}
        <div className="live-exercises">
          {session.exercises.length === 0 && (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-icon"><FiPlus size={32} /></div>
              <p className="text-sm text-secondary">Adiciona exercícios ao treino</p>
            </div>
          )}

          {session.exercises.map((ex, exIdx) => {
            const isCardio = ex.exercise?.muscleGroup === 'cardio';
            const doneCount = ex.sets.filter((s) => s.completed).length;
            const allDone = doneCount === ex.sets.length && ex.sets.length > 0;

            return (
              <div key={ex._id || exIdx} className={`live-ex-card ${allDone ? 'done' : ''}`}>
                <div className="live-ex-top">
                  <div className="live-ex-top-info">
                    <h3>{ex.exercise?.name}</h3>
                    <div className="live-ex-meta">
                      <span className="badge badge-primary">{ex.exercise?.muscleGroup}</span>
                      <span className="text-xs text-muted">
                        {allDone ? '✓ Completo' : `${doneCount}/${ex.sets.length}`}
                      </span>
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => removeExercise(exIdx)} aria-label="Remover">
                    <FiTrash2 size={15} />
                  </button>
                </div>

                <div className="live-sets-head">
                  <span>#</span>
                  <span>{isCardio ? 'Km' : 'Kg'}</span>
                  <span>{isCardio ? 'Min' : 'Reps'}</span>
                  <span></span>
                  <span></span>
                </div>

                {ex.sets.map((set, setIdx) => (
                  <div key={set._id || setIdx} className={`live-set-row ${set.completed ? 'completed' : ''}`}>
                    <span className="live-set-num">{setIdx + 1}</span>
                    <input
                      type="number"
                      className="live-set-input"
                      value={set.weight}
                      onChange={(e) => updateSetValue(set._id, 'weight', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step={isCardio ? '0.1' : '0.5'}
                      inputMode="decimal"
                      placeholder="0"
                    />
                    <input
                      type="number"
                      className="live-set-input"
                      value={set.reps}
                      onChange={(e) => updateSetValue(set._id, 'reps', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      min="1"
                      step="1"
                      inputMode="numeric"
                      placeholder="0"
                    />
                    <button
                      className={`live-check ${set.completed ? 'checked' : ''}`}
                      onClick={() => toggleSet(set._id, set.completed)}
                      aria-label={set.completed ? 'Desmarcar' : 'Confirmar'}
                    >
                      <FiCheck size={16} />
                    </button>
                    <button
                      className="btn-icon live-delete-set"
                      onClick={() => removeSet(exIdx, setIdx)}
                      disabled={ex.sets.length <= 1}
                      aria-label="Apagar série"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}

                <button className="btn btn-ghost btn-sm mt-2" onClick={() => addSet(exIdx)}>
                  <FiPlus size={12} /> Série
                </button>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="live-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowPicker(true)}>
            <FiPlus size={14} /> Adicionar Exercício
          </button>
          <button
            className="btn btn-accent"
            onClick={() => setShowFinish(true)}
            disabled={completedSets.length === 0}
          >
            <FiFlag size={14} /> Concluir Treino
          </button>
        </div>
      </div>

      {/* Picker */}
      {showPicker && (
        <ExercisePicker
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
          selectedIds={session.exercises.map((e) => e.exercise?.id)}
        />
      )}

      {/* Finish modal */}
      {showFinish && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Concluir Treino</h3>
              <button className="btn-icon" onClick={() => setShowFinish(false)} aria-label="Fechar"><FiX size={18} /></button>
            </div>
            <p className="text-sm text-secondary">
              O treino será guardado e contará para estatísticas e leaderboard.
            </p>
            <div className="finish-stats">
              <div className="finish-stat-item">
                <span className="val">{session.exercises.length}</span>
                <span className="lbl">Exercícios</span>
              </div>
              <div className="finish-stat-item">
                <span className="val">{completedSets.length}</span>
                <span className="lbl">Séries</span>
              </div>
              <div className="finish-stat-item">
                <span className="val">{totalVolume.toLocaleString('pt-PT')}</span>
                <span className="lbl">Volume</span>
              </div>
            </div>
            {allSets.length > completedSets.length && (
              <p className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
                {allSets.length - completedSets.length} série(s) não confirmadas serão ignoradas.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowFinish(false)}>Voltar</button>
              <button className="btn btn-accent" onClick={handleFinish} disabled={finishing}>
                <FiFlag size={14} /> {finishing ? 'A guardar...' : 'Concluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <ConfirmModal
          title="Cancelar treino?"
          message="O treino será eliminado e não contará para as tuas estatísticas."
          confirmLabel="Eliminar"
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
