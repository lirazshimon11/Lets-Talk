import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

export default function Auth() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'signup'); 
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (activeTab === 'signup') {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                if (data.user) {
                    navigate('/preferences');
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh', paddingTop: '100px' }}>
            <div className="auth-tabs-box">
                <div className="auth-tabs">
                    <button 
                        className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('signup'); setError(''); }}
                    >
                        Sign up
                    </button>
                    <button 
                        className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('login'); setError(''); }}
                    >
                        Log in
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form-content">
                    {error && <p style={{ color: '#ff4d4d', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>{error}</p>}
                    
                    <div className="input-group">
                        <label>Email address</label>
                        <input
                            type="email"
                            placeholder="example@gmail.com"
                            className="input-field"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Password"
                            className="input-field"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength="6"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="auth-join-btn" 
                        disabled={loading}
                    >
                        {loading 
                            ? (activeTab === 'signup' ? 'Joining...' : 'Logging In...') 
                            : (activeTab === 'signup' ? 'Join' : 'Log in')}
                    </button>
                </form>
            </div>
        </div>
    );
}
