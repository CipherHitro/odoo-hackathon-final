import React, { useState, useEffect } from "react";
import { Mail, Lock, KeyRound, CheckCircle2, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { loginUser, forgotPassword, verifyOtp, resetPassword } from "../api/auth";
import { useNavigate } from "react-router-dom";

const AuthCard = () => {
  // mode can be: 'login', 'forgot-password', 'verify-otp', 'reset-password'
  const [mode, setMode] = useState('login');

  const [formData, setFormData] = useState({
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
        setSuccessMessage(`OTP sent to ${formData.email}. Valid for 10 minutes.`);
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
        setSuccessMessage("OTP verified. Please create your new password.");
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
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        await resetPassword(resetToken, formData.password);
        switchMode('login');
        setSuccessMessage("Password updated! You can now sign in with your new password.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCardHeader = () => {
    switch (mode) {
      case 'forgot-password':
        return {
          badge: 'Account Recovery',
          title: 'Forgot Password',
          subtitle: 'Enter your work email to receive a 6-digit verification code.'
        };
      case 'verify-otp':
        return {
          badge: 'Security Verification',
          title: 'Verify OTP',
          subtitle: `Enter the 6-digit code sent to ${formData.email || 'your email'}.`
        };
      case 'reset-password':
        return {
          badge: 'Password Reset',
          title: 'Create New Password',
          subtitle: 'Choose a secure password with at least 8 characters.'
        };
      default:
        return {
          badge: 'HR Portal',
          title: 'Welcome back',
          subtitle: 'Sign in to continue to your workspace'
        };
    }
  };

  const header = getCardHeader();

  return (
    <div className="login-screen-wrapper">
      <div className="login-card-container">
        {/* Card Surface */}
        <div className="card login-card">
          {/* Header strip: --muted bg, rounded top corners */}
          <div className="login-card-header-strip">
            <span className="login-header-badge">{header.badge}</span>
            <div className="brand-dot-logo">
              <span className="dot-mark"></span>
              <span className="brand-name font-display">PeoplePay360</span>
            </div>
          </div>

          {/* Card Body */}
          <div className="login-card-body">
            <div className="login-title-section">
              <h1 className="login-heading font-display">{header.title}</h1>
              <p className="login-subheading">{header.subtitle}</p>
            </div>

            {error && (
              <div className="alert-box alert-box-danger">
                <AlertCircle size={16} className="alert-icon" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="alert-box alert-box-success">
                <CheckCircle2 size={16} className="alert-icon" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {/* Work Email field */}
              {(mode === 'login' || mode === 'forgot-password') && (
                <div className="form-group">
                  <label className="form-label" htmlFor="email">
                    Work Email
                  </label>
                  <div className="input-with-icon">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder="name@oxp.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      autoComplete="username"
                      required
                    />
                    <Mail size={16} className="input-trailing-icon" />
                  </div>
                </div>
              )}

              {/* OTP field */}
              {mode === 'verify-otp' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="otp">
                    6-Digit Verification Code
                  </label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      className="form-control"
                      placeholder="123456"
                      value={formData.otp}
                      onChange={handleInputChange}
                      maxLength={6}
                      autoFocus
                      required
                    />
                    <KeyRound size={16} className="input-trailing-icon" />
                  </div>
                  <div className="otp-countdown-row">
                    <span className={`timer-label ${timer <= 15 ? 'text-danger' : 'text-muted'}`}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {timer > 0 ? (
                        <>Expires in {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</>
                      ) : (
                        'Code expired'
                      )}
                    </span>
                    {canResend && (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="btn-text-link"
                        disabled={loading}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Password field for Login */}
              {mode === 'login' && (
                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="forgot-password-link"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-with-icon">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className="form-control"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="current-password"
                      required
                    />
                    <Lock size={16} className="input-trailing-icon" />
                  </div>
                </div>
              )}

              {/* Password fields for Reset Password */}
              {mode === 'reset-password' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="password">
                      New Password
                    </label>
                    <div className="input-with-icon">
                      <input
                        type="password"
                        id="password"
                        name="password"
                        className="form-control"
                        placeholder="At least 8 characters"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <Lock size={16} className="input-trailing-icon" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <div className="input-with-icon">
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className="form-control"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                      <Lock size={16} className="input-trailing-icon" />
                    </div>
                  </div>
                </>
              )}

              {/* Full-width coral button per Foundations */}
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Please wait..." : (
                  mode === 'login' ? "Sign In" :
                  mode === 'forgot-password' ? "Send Code" :
                  mode === 'verify-otp' ? "Verify Code" :
                  "Save New Password"
                )}
              </button>

              {mode !== 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="btn btn-outline w-full"
                  style={{ marginTop: '10px' }}
                >
                  <ArrowLeft size={14} style={{ marginRight: '6px' }} />
                  Back to Sign In
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Footer text below the card per spec */}
        <p className="login-footer-hint">
          Accounts are created by an administrator.
        </p>
      </div>
    </div>
  );
};

export default AuthCard;
