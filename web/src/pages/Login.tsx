import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function login(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('name', data.user.name);
      localStorage.setItem('role', data.user.role);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="login">
      <form className="card" onSubmit={login}>
        <h1>CRM Login</h1>
        {error && <p className="error-text">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="primary">Log in</button>
      </form>
    </div>
  );
}
