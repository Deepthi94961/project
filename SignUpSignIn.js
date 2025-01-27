import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Use useNavigate for navigation
import './App.css';

const SignUpSignIn = () => {
  const [activeForm, setActiveForm] = useState('signin');
  const navigate = useNavigate();

  const handleFormSubmit = async (e, formType) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const endpoint = formType === 'signin' ? '/signin' : '/signup';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch');
      }

      alert(result.message);
      if (formType === 'signin') {
        navigate('/admin'); // Navigate to AdminDashboard after sign-in
      }
    } catch (error) {
      console.error('Error:', error.message);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="signup-container">
      <div className="form-container">
        <div className="form-tabs">
          <span
            className={`tab ${activeForm === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveForm('signin')}
          >
            SIGN IN
          </span>
          <span
            className={`tab ${activeForm === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveForm('signup')}
          >
            SIGN UP
          </span>
        </div>
        {activeForm === 'signin' && (
          <form id="signin-form" onSubmit={(e) => handleFormSubmit(e, 'signin')}>
            <input name="email" type="email" placeholder="EMAIL" className="input-field" required />
            <input name="password" type="password" placeholder="PASSWORD" className="input-field" required />
            <button type="submit" className="form-button">SIGN IN</button>
            <div className="forgot-password" onClick={() => alert('Redirecting to Forgot Password page...')}>
              Forgot Password?
            </div>
            <div className="or-separator">OR</div>
            <button type="button" className="google-button" onClick={() => alert('Redirecting to Google login...')}>
              Login with Google
            </button>
          </form>
        )}
        {activeForm === 'signup' && (
          <form id="signup-form" onSubmit={(e) => handleFormSubmit(e, 'signup')}>
            <input name="fullName" type="text" placeholder="FULL NAME" className="input-field" required />
            <input name="email" type="email" placeholder="EMAIL" className="input-field" required />
            <input name="password" type="password" placeholder="PASSWORD" className="input-field" required />
            <input
              name="confirmPassword"
              type="password"
              placeholder="CONFIRM PASSWORD"
              className="input-field"
              required
            />
            <button type="submit" className="form-button">SIGN UP</button>
            <div className="or-separator">OR</div>
            <button type="button" className="google-button" onClick={() => alert('Redirecting to Google sign-up...')}>
              Sign Up with Google
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignUpSignIn;
