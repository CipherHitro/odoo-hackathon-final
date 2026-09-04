import React, { useState } from "react";
import { Mail, Lock, User, Terminal, KeyRound } from "lucide-react";
import { loginUser, registerUser, forgotPassword, verifyOtp, resetPassword } from "../api/auth";
import { useNavigate } from "react-router-dom";

const AuthCard = () => {
  // mode can be: 'login', 'signup', 'forgot-password', 'verify-otp', 'reset-password'
  const [mode, setMode] = useState('login');
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });
  const [resetToken, setResetToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    if (newMode === 'login' || newMode === 'signup') {
      setFormData({ name: "", email: "", password: "", otp: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginUser({ email: formData.email, password: formData.password });
        navigate("/dashboard");
      } else if (mode === 'signup') {
        await registerUser({ name: formData.name, email: formData.email, password: formData.password });
        navigate("/dashboard");
      } else if (mode === 'forgot-password') {
        await forgotPassword(formData.email);
        setMode('verify-otp');
      } else if (mode === 'verify-otp') {
        const response = await verifyOtp(formData.email, formData.otp);
        setResetToken(response.reset_token);
        setMode('reset-password');
      } else if (mode === 'reset-password') {
        await resetPassword(resetToken, formData.password);
        switchMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    switch (mode) {
      case 'signup':
        return { title: 'Create an account', subtitle: 'Join us today to manage your business effectively.' };
      case 'forgot-password':
        return { title: 'Reset Password', subtitle: 'Enter your email to receive an OTP.' };
      case 'verify-otp':
        return { title: 'Verify OTP', subtitle: 'Enter the 6-digit code sent to your email.' };
      case 'reset-password':
        return { title: 'New Password', subtitle: 'Enter your new secure password.' };
      default:
        return { title: 'Welcome back!', subtitle: 'Please enter your details to sign in.' };
    }
  };

  const headerText = renderHeader();

  return (
    <>
      <div className="bg-waves">
        <div className="wave"></div>
        <div className="wave"></div>
      </div>
      <div className="auth-container">
        <div className="auth-form-section">
          <div className="logo-container">
            <div className="logo-icon">
              <Terminal size={20} />
            </div>
            <span className="logo-text">TechERP</span>
          </div>

          <div className="header-text">
            <h2>{headerText.title}</h2>
            <p className="subtitle">{headerText.subtitle}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="input-group">
                <label className="input-label" htmlFor="name">
                  Full Name
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="input-field"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                  <User size={20} />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
              <div className="input-group">
                <label className="input-label" htmlFor="email">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="input-field"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                  <Mail size={20} />
                </div>
              </div>
            )}

            {mode === 'verify-otp' && (
              <div className="input-group">
                <label className="input-label" htmlFor="otp">
                  One-Time Password (OTP)
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    className="input-field"
                    placeholder="Enter 6-digit OTP"
                    value={formData.otp}
                    onChange={handleInputChange}
                    maxLength="6"
                    required
                  />
                  <KeyRound size={20} />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
              <div className="input-group">
                <label className="input-label" htmlFor="password">
                  {mode === 'reset-password' ? 'New Password' : 'Password'}
                </label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="input-field"
                    placeholder={mode === 'reset-password' ? 'Enter new password' : 'Enter your password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <Lock size={20} />
                </div>
                {mode === 'login' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Processing..." : (
                mode === 'login' ? "Login Now" :
                mode === 'signup' ? "Register" :
                mode === 'forgot-password' ? "Send OTP" :
                mode === 'verify-otp' ? "Verify OTP" :
                "Reset Password"
              )}
            </button>
          </form>

          <div className="divider">OR</div>

          <button
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="btn btn-outline"
            type="button"
          >
            {mode === 'login' ? "Signup Now" : "Back to Login"}
          </button>
        </div>

        <div className="auth-illustration-section">
          <div className="illustration-content">
            <h3>Enterprise Resource Planning</h3>
            <p>
              Streamline your business processes, enhance collaboration, and
              drive growth with TechERP.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthCard;
