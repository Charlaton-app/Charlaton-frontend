import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import { useToastContext } from "../../contexts/ToastContext";
import googleIcon from "/icons/google-icon.svg";
import githubIcon from "/icons/github-icon.svg";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import WebContentReader from "../../components/web-reader/WebContentReader";
import "./Login.scss";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, loginWithGoogle, loginWithGithub, isLoading } = useAuthStore();
  const toast = useToastContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Si el usuario ya está logueado, redirigir al dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleLoginGoogle = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await loginWithGoogle();
    if (result.success) {
      toast.success("Inicio de sesión exitoso");
      navigate("/dashboard");
    } else {
      toast.error(result.error || "Error al iniciar sesión con Google");
    }
  };

  const handleLoginGithub = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await loginWithGithub();
    if (result.success) {
      toast.success("Inicio de sesión exitoso");
      navigate("/dashboard");
    } else {
      toast.error(result.error || "Error al iniciar sesión con GitHub");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!email || !password) {
      toast.error("Por favor, completa todos los campos");
      return;
    }

    if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      toast.success("Inicio de sesión exitoso");
      navigate("/dashboard");
    } else {
      toast.error(result.error || "Error al iniciar sesión");
    }
  };

  return (
    <div className="login-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      {/* Header */}
      <Navbar showAuthButtons={!user} />

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
                aria-invalid="false"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="••••••••"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={passwordError ? "true" : "false"}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              {passwordError && (
                <span id="password-error" className="field-error" role="alert">
                  {passwordError}
                </span>
              )}
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
              <img src={googleIcon} alt="" aria-hidden="true" />
              Google
            </button>

            <button
              onClick={handleLoginGithub}
              className="social-btn github-btn"
              disabled={isLoading}
              aria-label="Iniciar sesión con GitHub"
            >
              <img src={githubIcon} alt="" aria-hidden="true" />
              GitHub
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
