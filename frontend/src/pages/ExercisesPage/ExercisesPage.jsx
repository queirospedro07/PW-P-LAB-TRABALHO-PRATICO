import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2, FiTrendingUp, FiSearch, FiX } from 'react-icons/fi';
import api from '../../services/api';
import Dropdown from '../../components/Dropdown';
import Pagination from '../../components/Pagination';
import PageLoader from '../../components/PageLoader';
import './ExercisesPage.css';

const CACHE_KEY = 'wt_muscle_groups';

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', muscleGroup: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  useEffect(() => { loadMuscleGroups(); loadExercises(); }, []);
  useEffect(() => { const t = setTimeout(() => { setPage(1); loadExercises(); }, 150); return () => clearTimeout(t); }, [search, filter]);

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
    try { const r = await api.post('/exercises', newEx); setExercises((p) => [r.data, ...p]); setNewEx({ name: '', muscleGroup: '', description: '' }); setShowCreate(false); }
    catch (err) { setCreateError(err.response?.data?.message || 'Erro ao criar.'); }
    finally { setCreating(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/exercises/${deleteId}`);
      setExercises((p) => p.filter((e) => e.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao eliminar exercício.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(exercises.length / LIMIT);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Exercícios</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus size={14} /> Novo</button>
      </div>

      <div className="card mb-4">
        <div className="filters-row">
          <div className="search-wrap">
            <FiSearch size={14} className="search-icon" />
            <input type="text" className="form-input" placeholder="Pesquisar exercício..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Dropdown
            options={muscleGroups.map((g) => ({ value: g, label: g }))}
            value={filter}
            onChange={(val) => setFilter(val)}
            placeholder="Todos"
          />
        </div>
      </div>

      {loading ? <PageLoader /> :
      exercises.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FiSearch size={32} /></div>
          <h3>Nenhum exercício</h3>
          <button className="btn btn-primary mt-3" onClick={() => setShowCreate(true)}><FiPlus size={14} /> Criar</button>
        </div>
      ) : (
        <>
        <div className="exercises-grid">
          {exercises.slice((page - 1) * LIMIT, page * LIMIT).map((ex) => (
            <div key={ex.id} className="card ex-card">
              <div className="ex-card-top">
                <div>
                  <h3>{ex.name}</h3>
                  <span className="badge badge-primary">{ex.muscleGroup}</span>
                </div>
                {!ex.isSystem && (
                  <button className="btn-icon" onClick={() => setDeleteId(ex.id)} aria-label="Eliminar"><FiTrash2 size={14} /></button>
                )}
              </div>
              <p className="text-xs text-secondary ex-desc">{ex.description}</p>
              <Link to={`/exercises/${ex.id}/history`} className="btn btn-ghost btn-sm mt-2">
                <FiTrendingUp size={12} /> Evolução
              </Link>
            </div>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Novo exercício</h3>
              <button className="btn-icon" onClick={() => setShowCreate(false)} aria-label="Fechar"><FiX size={18} /></button>
            </div>
            {createError && <div className="alert alert-error">{createError}</div>}
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="form-group"><label className="form-label">Nome</label><input type="text" className="form-input" value={newEx.name} onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Grupo muscular</label><Dropdown options={muscleGroups.map((g) => ({ value: g, label: g }))} value={newEx.muscleGroup} onChange={(val) => setNewEx({ ...newEx, muscleGroup: val })} placeholder="Selecionar" /></div>
              <div className="form-group"><label className="form-label">Descrição</label><textarea className="form-textarea" value={newEx.description} onChange={(e) => setNewEx({ ...newEx, description: e.target.value })} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'A criar...' : 'Criar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Eliminar exercício?</h3>
              <button className="btn-icon" onClick={() => { setDeleteId(null); setDeleteError(''); }} aria-label="Fechar"><FiX size={18} /></button>
            </div>
            {deleteError ? (
              <>
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{deleteError}</div>
                <p className="text-sm text-secondary">Remove o exercício das sessões e planos antes de o eliminar.</p>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => { setDeleteId(null); setDeleteError(''); }}>Fechar</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-secondary">Esta ação não pode ser desfeita.</p>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => { setDeleteId(null); setDeleteError(''); }} disabled={deleting}>Cancelar</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'A eliminar...' : 'Eliminar'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
