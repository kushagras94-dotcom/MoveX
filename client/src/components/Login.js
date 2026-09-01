import React, { useState } from 'react';
import axios from 'axios';
import {  Link } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'https://uber-ride-booking-backend.onrender.com/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  //const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('name', res.data.user.name);

      if (res.data.user.role === 'rider') window.location.href = '/rider';
      else window.location.href = '/driver';

    } catch (err) {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}> MoveX</h1>
        <h2 style={styles.subtitle}>Login</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleLogin}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={styles.link}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' },
  card: { background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
  title: { textAlign: 'center', color: '#000', marginBottom: '0.5rem' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: '1.5rem' },
  input: { width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' },
  error: { color: 'red', textAlign: 'center', marginBottom: '1rem' },
  link: { textAlign: 'center', marginTop: '1rem', color: '#666' }
};

export default Login;