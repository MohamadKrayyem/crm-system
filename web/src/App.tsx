import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Briefcase, CheckSquare, LayoutDashboard, LogOut, Users, X } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/deals', label: 'Deals', icon: Briefcase },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
];

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  function logout() {
    localStorage.clear();
    window.location.href = '/login';
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>CRM</h1>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          {localStorage.getItem('name')} ({localStorage.getItem('role')})
          <button onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
