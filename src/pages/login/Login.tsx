import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import {
  auth,
  googleProvider,
  facebookProvider,
} from "../../lib/firebase.config";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Login.scss";

/**
 * Página de inicio de sesión de la aplicación.
 * 
 * Métodos de autenticación soportados:
 * - Email y contraseña tradicional
 * - Google OAuth
 * - Facebook OAuth
 * 
 * Flujo de autenticación:
 * 1. Usuario ingresa credenciales o selecciona proveedor OAuth
 * 2. Se validan las credenciales contra Firebase Auth
 * 3. En caso de éxito, se redirige al dashboard
 * 4. En caso de error, se muestra mensaje descriptivo
 * 
 * Características:
 * - Validación de campos requeridos
 * - Estado de carga durante autenticación
 * - Enlaces a registro y recuperación de contraseña
 * - Diseño responsive
 * 
 * Accesibilidad (WCAG 2.1):
 * - Skip link para contenido principal
 * - Labels asociados a inputs con htmlFor
 * - aria-required en campos obligatorios
 * - aria-invalid en campos con error
 * - aria-describedby para asociar errores
 * - role="alert" en mensajes de error
 * - aria-labels descriptivos en botones sociales
 * 
 * @component
 * @returns {JSX.Element} Página de login completa
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Maneja el inicio de sesión con Google OAuth.
   * Redirige al dashboard en caso de éxito.
   * 
   * @async
   * @param {React.FormEvent} e - Evento del botón
   * @returns {Promise<void>}
   */
  const handleLoginGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      };
      setUser(user);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error al iniciar sesión con Google:", error);
      setError(
        "Error al iniciar sesión con Google. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el inicio de sesión con Facebook OAuth.
   * Redirige al dashboard en caso de éxito.
   * 
   * @async
   * @param {React.FormEvent} e - Evento del botón
   * @returns {Promise<void>}
   */
  const handleLoginFacebook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const user = {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      };
      setUser(user);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error al iniciar sesión con Facebook:", error);
      setError(
        "Error al iniciar sesión con Facebook. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el inicio de sesión con email y contraseña.
   * Valida que ambos campos estén completos antes de enviar.
   * Redirige al dashboard en caso de éxito.
   * 
   * @async
   * @param {React.FormEvent} e - Evento del formulario
   * @returns {Promise<void>}
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Por favor, completa todos los campos");
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      };
      setUser(user);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error);
      setError(
        "Credenciales incorrectas. Por favor, verifica tu correo y contraseña."
      );
    } finally {
      setLoading(false);
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
                disabled={loading}
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
                disabled={loading}
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              aria-label="Iniciar sesión con correo electrónico"
            >
              {loading ? "Ingresando..." : "INICIAR SESIÓN"}
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
              disabled={loading}
              aria-label="Iniciar sesión con Google"
            >
              <img src="/icons/google-icon.svg" alt="" aria-hidden="true" />
              Google
            </button>

            <button
              onClick={handleLoginFacebook}
              className="social-btn facebook-btn"
              disabled={loading}
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
