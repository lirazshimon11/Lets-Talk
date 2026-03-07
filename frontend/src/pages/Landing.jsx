import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
    return (
        <div className="landing-container">
            <div className="landing-hero">
                <h1 className="landing-title">Let's <span>Talk</span></h1>
                <p className="landing-subtitle">Sign up to see photos strictly after a great chat.</p>
                <div className="landing-buttons">
                    <Link to="/register" className="btn-landing-primary">Get Started</Link>
                    <Link to="/login" className="btn-landing-secondary">Log In</Link>
                </div>
            </div>

            <div className="landing-features">
                <div className="feature-card">
                    <div className="feature-icon">💬</div>
                    <h3>Match First</h3>
                    <p>Connect based on what you have to say.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">📸</div>
                    <h3>See Later</h3>
                    <p>Reveal photos only after a great conversation.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">🔒</div>
                    <h3>Secure & Private</h3>
                    <p>Your data is protected and kept private.</p>
                </div>
            </div>
        </div>
    );
}
