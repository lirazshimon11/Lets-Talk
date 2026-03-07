import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const data = await request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/preferences');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h1 className="brand-title">Let's Talk</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>Sign up to see photos strictly after a great chat.</p>
                <form onSubmit={handleRegister}>
                    {error && <p style={{ color: '#ff4d4d', fontSize: '14px' }}>{error}</p>}
                    <input
                        type="text"
                        placeholder="Username"
                        className="input-field"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="input-field"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn-primary">Sign Up</button>
                </form>
                <div className="auth-switch">
                    Have an account? <Link to="/login">Log in</Link>
                </div>
            </div>
        </div>
    );
}
