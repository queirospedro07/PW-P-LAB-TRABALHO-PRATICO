import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiHome, FiPlusCircle, FiList, FiActivity, FiLogOut, FiBookOpen, FiX, FiShield } from 'react-icons/fi';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="topbar-brand">
            <FiActivity size={20} />
            <span>Workout Tracker</span>
          </NavLink>
          <nav className="topbar-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
            <NavLink to="/sessions" className={({ isActive }) => isActive ? 'active' : ''}>Sessões</NavLink>
            <NavLink to="/exercises" className={({ isActive }) => isActive ? 'active' : ''}>Exercícios</NavLink>
            <NavLink to="/plans" className={({ isActive }) => isActive ? 'active' : ''}>Planos</NavLink>
            {user?.isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>Admin</NavLink>
            )}
          </nav>
          <div className="topbar-user">
            <span className="text-secondary text-sm">{user?.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowLogoutModal(true)}>
              <FiLogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <FiHome size={20} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/sessions/new" className={({ isActive }) => `bnav-item bnav-cta ${isActive ? 'active' : ''}`}>
          <FiPlusCircle size={24} />
        </NavLink>
        <NavLink to="/sessions" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <FiList size={20} />
          <span>Histórico</span>
        </NavLink>
        <NavLink to="/exercises" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <FiActivity size={20} />
          <span>Exercícios</span>
        </NavLink>
        <NavLink to="/plans" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <FiBookOpen size={20} />
          <span>Planos</span>
        </NavLink>
        {user?.isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
            <FiShield size={20} />
            <span>Admin</span>
          </NavLink>
        )}
        <button className="bnav-logout" onClick={() => setShowLogoutModal(true)} aria-label="Sair">
          <FiLogOut size={20} />
          <span>Sair</span>
        </button>
      </nav>

      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Terminar sessão?</h3>
              <button className="btn-icon" onClick={() => setShowLogoutModal(false)} aria-label="Fechar"><FiX size={18} /></button>
            </div>
            <p className="text-sm text-secondary">Vais sair da tua conta.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowLogoutModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmLogout}>Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
