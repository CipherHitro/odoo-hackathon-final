import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Terminal, KeyRound, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { loginUser, forgotPassword, verifyOtp, resetPassword } from "../api/auth";
import { useNavigate } from "react-router-dom";

const AuthCard = () => {
  // mode can be: 'login', 'forgot-password', 'verify-otp', 'reset-password'
  const [mode, setMode] = useState('login');

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const [resetToken, setResetToken] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();

  // 10-minute OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (mode === 'verify-otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, timer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    if (newMode === 'login') {
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "", otp: "" }));
      setResetToken(null);
    } else if (newMode === 'forgot-password') {
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "", otp: "" }));
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await forgotPassword(formData.email);
      setTimer(600);
      setCanResend(false);
      setFormData((prev) => ({ ...prev, otp: "" }));
      setSuccessMessage("A fresh OTP has been sent to your email (valid for 10 minutes).");
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginUser({ email: formData.email, password: formData.password });
        navigate("/dashboard");
      } else if (mode === 'forgot-password') {
        await forgotPassword(formData.email);
        setTimer(600);
        setCanResend(false);
        setSuccessMessage(`OTP sent to ${formData.email}. It expires in 10 minutes.`);
        setMode('verify-otp');
      } else if (mode === 'verify-otp') {
        const trimmedOtp = formData.otp.trim();
        if (trimmedOtp.length !== 6) {
          setError("Please enter the complete 6-digit OTP.");
          setLoading(false);
          return;
        }
        const response = await verifyOtp(formData.email, trimmedOtp);
        setResetToken(response.reset_token);
        setSuccessMessage("OTP verified! Please create your new password.");
        setMode('reset-password');
      } else if (mode === 'reset-password') {
        if (!formData.password) {
          setError("Please enter a new password.");
          setLoading(false);
          return;
        }
        if (formData.password.length < 8) {
          setError("New password must be at least 8 characters long.");
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match. Please re-enter your password.");
          setLoading(false);
          return;
        }

        await resetPassword(resetToken, formData.password);
        switchMode('login');
        setSuccessMessage("Password reset successfully! Please log in with your new password.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    switch (mode) {
      case 'forgot-password':
        return { title: 'Forgot Password', subtitle: 'Enter your registered email to receive a 6-digit verification code.' };
      case 'verify-otp':
        return { title: 'Verify OTP', subtitle: `Enter the 6-digit code sent to ${formData.email || 'your email'} (valid for 10 min).` };
      case 'reset-password':
        return { title: 'New Password', subtitle: 'Enter and re-enter your new secure password.' };
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

          {error && (
            <div className="error-message">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email field for login and forgot-password */}
            {(mode === 'login' || mode === 'forgot-password') && (
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

            {/* OTP field for verify-otp */}
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
                    placeholder="Enter 6-digit code"
                    value={formData.otp}
                    onChange={handleInputChange}
                    maxLength={6}
                    autoFocus
                    required
                  />
                  <KeyRound size={20} />
                </div>
                <div className="otp-timer-row">
                  <span className={`timer-text ${timer <= 15 ? 'timer-warning' : ''}`}>
                    <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    {timer > 0 ? (
                      <>Expires in <strong>{String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</strong></>
                    ) : (
                      <strong className="text-expired">OTP Expired</strong>
                    )}
                  </span>
                  {canResend && (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="btn-link"
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Password field for login */}
            {mode === 'login' && (
              <div className="input-group">
                <label className="input-label" htmlFor="password">
                  Password
                </label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <Lock size={20} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}

            {/* Two password fields for reset-password: Enter Password and Re-enter Password */}
            {mode === 'reset-password' && (
              <>
                <div className="input-group">
                  <label className="input-label" htmlFor="password">
                    New Password
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className="input-field"
                      placeholder="Enter new password (min 8 chars)"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                    <Lock size={20} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="confirmPassword">
                    Re-enter New Password
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      className="input-field"
                      placeholder="Re-enter your new password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                    <Lock size={20} />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Processing..." : (
                mode === 'login' ? "Login Now" :
                  mode === 'forgot-password' ? "Send OTP" :
                    mode === 'verify-otp' ? "Verify OTP" :
                      "Update Password"
              )}
            </button>
          </form>

          {mode !== 'login' && (
            <button
              onClick={() => switchMode('login')}
              className="btn btn-outline"
              type="button"
              style={{ marginTop: '1rem' }}
            >
              Back to Login
            </button>
          )}
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
