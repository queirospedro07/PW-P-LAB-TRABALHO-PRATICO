import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiActivity } from 'react-icons/fi';
import '../LoginPage/AuthPage.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Palavra-passe deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors?.length ? errors.map((e) => e.msg).join('. ') : err.response?.data?.message || 'Erro ao registar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <FiActivity size={32} className="auth-icon" />
          <h1>Workout Tracker</h1>
          <p className="text-secondary text-sm">Cria a tua conta</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nome</label>
            <input id="name" name="name" type="text" className="form-input" placeholder="O teu nome" value={form.name} onChange={handleChange} required autoComplete="name" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="form-input" placeholder="email@exemplo.com" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Palavra-passe</label>
            <input id="password" name="password" type="password" className="form-input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'A registar...' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-footer">
          Já tens conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
