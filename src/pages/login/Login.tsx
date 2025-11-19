import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Login.scss";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithFacebook, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLoginGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const result = await loginWithGoogle();
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error || "Error al iniciar sesión con Google");
    }
  };

  const handleLoginFacebook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const result = await loginWithFacebook();
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error || "Error al iniciar sesión con Facebook");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, completa todos los campos");
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error || "Error al iniciar sesión");
    }
  };

  return (
    <div className="login-page">
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      {/* Header */}
      <Navbar showAuthButtons={false} />

      {/* Main Content */}
      <main id="main-content" className="main-content">
        <div className="login-card">
          {/* Logo */}
          <div className="logo-container">
            <div className="logo-icon" aria-hidden="true">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1>Ingresa a tu cuenta</h1>
          <p className="subtitle">Conecta con tu equipo de forma sencilla</p>

          {/* Error Message */}
          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@ejemplo.com"
                disabled={isLoading}
                aria-required="true"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
              aria-label="Iniciar sesión con correo electrónico"
            >
              {isLoading ? "Ingresando..." : "INICIAR SESIÓN"}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>o continúa con</span>
          </div>

          {/* Social Sign In Buttons */}
          <div className="social-buttons">
            <button
              onClick={handleLoginGoogle}
              className="social-btn google-btn"
              disabled={isLoading}
              aria-label="Iniciar sesión con Google"
            >
              <img src="/icons/google-icon.svg" alt="" aria-hidden="true" />
              Google
            </button>

            <button
              onClick={handleLoginFacebook}
              className="social-btn facebook-btn"
              disabled={isLoading}
              aria-label="Iniciar sesión con Facebook"
            >
              <img src="/icons/facebook-icon.svg" alt="" aria-hidden="true" />
              Facebook
            </button>
          </div>

          {/* Register Link */}
          <p className="register-link">
            ¿No tienes una cuenta? <a href="/signup">Regístrate</a>
          </p>

          {/* Forgot Password */}
          <p className="forgot-password">
            <a href="/recovery">¿Olvidaste tu contraseña?</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Login;
