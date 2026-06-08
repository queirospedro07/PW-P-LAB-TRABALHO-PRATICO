import { useState, useEffect, useRef } from 'react';
import { FiX, FiSearch, FiPlus } from 'react-icons/fi';
import api from '../../services/api';
import Dropdown from '../Dropdown';
import './ExercisePicker.css';

const CACHE_KEY = 'wt_muscle_groups';

export default function ExercisePicker({ onSelect, onClose, selectedIds = [] }) {
  const [exercises, setExercises] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', muscleGroup: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); loadMuscleGroups(); loadExercises(); }, []);
  useEffect(() => { const t = setTimeout(loadExercises, 150); return () => clearTimeout(t); }, [search, filter]);

  const loadMuscleGroups = async () => {
    try { const r = await api.get('/exercises/muscle-groups'); setMuscleGroups(r.data); localStorage.setItem(CACHE_KEY, JSON.stringify(r.data)); }
    catch { const c = localStorage.getItem(CACHE_KEY); if (c) setMuscleGroups(JSON.parse(c)); }
  };

  const loadExercises = async () => {
    setLoading(true);
    try { const p = {}; if (search) p.search = search; if (filter) p.muscleGroup = filter; const r = await api.get('/exercises', { params: p }); setExercises(r.data); }
    catch { setExercises([]); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setCreateError('');
    if (!newEx.name || !newEx.muscleGroup || !newEx.description) { setCreateError('Preenche todos os campos.'); return; }
    setCreating(true);
    try { const r = await api.post('/exercises', newEx); onSelect(r.data); }
    catch (err) { setCreateError(err.response?.data?.message || 'Erro ao criar.'); }
    finally { setCreating(false); }
  };

  const filtered = exercises.filter((ex) => !selectedIds.includes(ex.id));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal picker-modal">
        <div className="picker-header">
          <h2>Escolher exercício</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar"><FiX size={18} /></button>
        </div>

        <div className="picker-filters">
          <div className="search-wrap">
            <FiSearch size={14} className="search-icon" />
            <input ref={searchRef} type="text" className="form-input" placeholder="Pesquisar exercício..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Dropdown
            options={muscleGroups.map((g) => ({ value: g, label: g }))}
            value={filter}
            onChange={(val) => setFilter(val)}
            placeholder="Todos"
          />
        </div>

        {!showCreate ? (
          <div className="picker-list">
            {loading ? <div className="loading-center"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p className="text-sm text-secondary">Nenhum resultado</p>
                <button className="btn btn-primary btn-sm mt-3" onClick={() => { setShowCreate(true); setNewEx((p) => ({ ...p, name: search })); }}>
                  <FiPlus size={12} /> Criar novo
                </button>
              </div>
            ) : (
              <>
                {filtered.map((ex) => (
                  <button key={ex.id} className="picker-item" onClick={() => onSelect(ex)}>
                    <div className="picker-item-info">
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-xs text-muted">{ex.description?.slice(0, 50)}</span>
                    </div>
                    <span className="badge badge-primary">{ex.muscleGroup}</span>
                  </button>
                ))}
                <button className="btn btn-ghost btn-sm mt-2" onClick={() => setShowCreate(true)}>
                  <FiPlus size={12} /> Criar novo
                </button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="create-form">
            <h3>Novo exercício</h3>
            {createError && <div className="alert alert-error">{createError}</div>}
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input type="text" className="form-input" value={newEx.name} onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Grupo muscular</label>
              <Dropdown
                options={muscleGroups.map((g) => ({ value: g, label: g }))}
                value={newEx.muscleGroup}
                onChange={(val) => setNewEx({ ...newEx, muscleGroup: val })}
                placeholder="Selecionar"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-textarea" value={newEx.description} onChange={(e) => setNewEx({ ...newEx, description: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Voltar</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'A criar...' : 'Criar'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
