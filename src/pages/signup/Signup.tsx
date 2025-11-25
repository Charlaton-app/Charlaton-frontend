import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import WebContentReader from '../../components/web-reader/WebContentReader';
import "./Signup.scss";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup, loginWithGoogle, loginWithGithub, isLoading } =
    useAuthStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    edad: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.edad ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Por favor, completa todos los campos");
      return;
    }

    const edadNum = parseInt(formData.edad, 10);
    if (isNaN(edadNum) || edadNum < 1 || edadNum > 120) {
      setError("Por favor, ingresa una edad válida (entre 1 y 120)");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const result = await signup({
      email: formData.email,
      nickname: formData.name,
      edad: edadNum,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    if (result.success) {
      navigate("/signup-success");
    } else {
      setError(result.error || "Error al registrarse");
    }
  };

  const handleGoogleSignup = async () => {
    setError("");

    const result = await loginWithGoogle();
    if (result.success) {
      navigate("/signup-success");
    } else {
      setError(result.error || "Error al registrarse con Google");
    }
  };

  const handleGithubSignup = async () => {
    setError("");

    const result = await loginWithGithub();
    if (result.success) {
      navigate("/signup-success");
    } else {
      setError(result.error || "Error al registrarse con GitHub");
    }
  };

  return (
    <div className="signup-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      <Navbar showAuthButtons={false} />

      <main id="main-content" className="main-content">
        <div className="signup-card">
          <div className="logo-container">
            <div className="logo-icon" aria-hidden="true">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
              </svg>
            </div>
          </div>

          <h1>Crea tu cuenta</h1>
          <p className="subtitle">Únete a Charlaton y comienza a colaborar</p>

          {error && (
            <div id="signup-error" className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label htmlFor="name">Nombre completo</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Juan Pérez"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error && !formData.name ? "true" : "false"}
                aria-describedby={error ? "signup-error" : undefined}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@ejemplo.com"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error && !formData.email ? "true" : "false"}
                aria-describedby={error ? "signup-error" : undefined}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edad">Edad</label>
              <input
                type="number"
                id="edad"
                name="edad"
                value={formData.edad}
                onChange={handleChange}
                placeholder="18"
                min="1"
                max="120"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error && !formData.edad ? "true" : "false"}
                aria-describedby={error ? "signup-error edad-help" : "edad-help"}
              />
              <span id="edad-help" className="visually-hidden">Ingresa tu edad (entre 1 y 120 años)</span>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error && formData.password.length < 6 && formData.password.length > 0 ? "true" : "false"}
                aria-describedby={error ? "signup-error password-help" : "password-help"}
              />
              <span id="password-help" className="visually-hidden">La contraseña debe tener al menos 6 caracteres</span>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error && formData.password !== formData.confirmPassword && formData.confirmPassword.length > 0 ? "true" : "false"}
                aria-describedby={error ? "signup-error" : undefined}
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
              aria-label="Crear cuenta"
            >
              {isLoading ? "Creando cuenta..." : "CREAR CUENTA"}
            </button>
          </form>

          <div className="divider">
            <span>o regístrate con</span>
          </div>

          <div className="social-buttons">
            <button
              onClick={handleGoogleSignup}
              className="social-btn google-btn"
              disabled={isLoading}
              aria-label="Registrarse con Google"
            >
              <img src="/icons/google-icon.svg" alt="" aria-hidden="true" />
              Google
            </button>

            <button
              onClick={handleGithubSignup}
              className="social-btn github-btn"
              disabled={isLoading}
              aria-label="Registrarse con GitHub"
            >
              <img src="/icons/github-icon.svg" alt="" aria-hidden="true" />
              GitHub
            </button>
          </div>

          <p className="login-link">
            ¿Ya tienes una cuenta? <a href="/login">Inicia sesión</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Signup;
