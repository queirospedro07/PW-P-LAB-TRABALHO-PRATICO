import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiActivity } from 'react-icons/fi';
import './AuthPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao autenticar.');
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
          <p className="text-secondary text-sm">Entra na tua conta</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="form-input" placeholder="email@exemplo.com" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Palavra-passe</label>
            <input id="password" name="password" type="password" className="form-input" placeholder="A tua palavra-passe" value={form.password} onChange={handleChange} required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer">
          Não tens conta? <Link to="/register">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
