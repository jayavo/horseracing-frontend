import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🏇</div>
        <h1 style={styles.title}>Race Analyser</h1>
        <p style={styles.sub}>Sign in to access your dashboard</p>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoFocus />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  card: { background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 400, textAlign: 'center' },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { color: '#fff', fontSize: 26, fontWeight: 600, margin: '0 0 6px' },
  sub: { color: '#666', fontSize: 14, margin: '0 0 32px' },
  field: { marginBottom: 16, textAlign: 'left' },
  label: { display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6, fontWeight: 500 },
  input: { width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  error: { background: '#2d1515', border: '1px solid #5a2020', borderRadius: 8, color: '#ff6b6b', padding: '10px 14px', marginBottom: 16, fontSize: 13 },
  btn: { width: '100%', padding: '12px', background: '#1d9e75', border: 'none', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 }
};
