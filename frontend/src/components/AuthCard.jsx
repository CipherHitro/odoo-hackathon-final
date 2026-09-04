import React, { useState } from "react";
import { Mail, Lock, User, Terminal } from "lucide-react";
import { loginUser, registerUser } from "../api/auth";
import { useNavigate } from "react-router-dom";

const AuthCard = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFormData({ name: "", email: "", password: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await loginUser({ email: formData.email, password: formData.password });
        navigate("/dashboard");
      } else {
        await registerUser(formData);
        // After successful registration, we can login the user automatically or redirect to login.
        // The backend's register endpoint seems to return an AuthResponse,
        // so it might also log them in (set cookie). Let's assume it does and go to dashboard.
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            <h2>{isLogin ? "Welcome back!" : "Create an account"}</h2>
            <p className="subtitle">
              {isLogin
                ? "Please enter your details to sign in."
                : "Join us today to manage your business effectively."}
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
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
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Login Now" : "Register"}
            </button>
          </form>

          <div className="divider">OR</div>

          <button
            onClick={toggleAuthMode}
            className="btn btn-outline"
            type="button"
          >
            {isLogin ? "Signup Now" : "Back to Login"}
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
