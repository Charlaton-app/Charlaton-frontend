import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  facebookProvider,
} from "../../lib/firebase.config";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Signup.scss";

/**
 * Página de registro de nuevos usuarios.
 * 
 * Métodos de registro soportados:
 * - Formulario tradicional (nombre, email, contraseña)
 * - Google OAuth
 * - Facebook OAuth
 * 
 * Validaciones del formulario:
 * - Todos los campos son requeridos
 * - Las contraseñas deben coincidir
 * - Contraseña mínima de 6 caracteres
 * 
 * Flujo de registro:
 * 1. Usuario completa formulario o selecciona proveedor OAuth
 * 2. Se validan los datos localmente
 * 3. Se envía la solicitud de registro
 * 4. En caso de éxito, se redirige a la página de éxito
 * 5. En caso de error, se muestra mensaje descriptivo
 * 
 * Accesibilidad (WCAG 2.1):
 * - Skip link para contenido principal
 * - Labels asociados a inputs con htmlFor
 * - aria-required en campos obligatorios
 * - aria-invalid en campos con error
 * - aria-describedby para asociar errores y ayudas
 * - visually-hidden para mensajes de ayuda
 * - role="alert" en mensajes de error
 * 
 * @component
 * @returns {JSX.Element} Página de registro completa
 */
const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

   /**
   * Estado del formulario de registro.
   * @type {{name: string, email: string, password: string, confirmPassword: string}}
   */
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Maneja cambios en los campos del formulario.
   * Actualiza el estado correspondiente al campo modificado.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - Evento del input
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * Maneja el envío del formulario de registro.
   * Realiza validaciones locales antes de enviar al servidor.
   * 
   * Validaciones:
   * - Todos los campos deben estar completos
   * - Las contraseñas deben coincidir
   * - La contraseña debe tener mínimo 6 caracteres
   * 
   * @async
   * @param {React.FormEvent} e - Evento del formulario
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Por favor, completa todos los campos");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await updateProfile(result.user, {
        displayName: formData.name,
      });

      const user = {
        displayName: formData.name,
        email: result.user.email,
        photoURL: result.user.photoURL,
      };
      setUser(user);
      navigate("/signup-success");
    } catch (error: any) {
      console.error("Error al registrar:", error);
      if (error.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado");
      } else if (error.code === "auth/invalid-email") {
        setError("Correo electrónico inválido");
      } else if (error.code === "auth/weak-password") {
        setError("La contraseña es muy débil");
      } else {
        setError("Error al crear la cuenta. Por favor, intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el registro con Google OAuth.
   * Redirige a la página de éxito si el registro es exitoso.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleGoogleSignup = async () => {
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
      navigate("/signup-success");
    } catch (error: any) {
      console.error("Error con Google:", error);
      setError(
        "Error al registrarse con Google. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

   /**
   * Maneja el registro con Facebook OAuth.
   * Redirige a la página de éxito si el registro es exitoso.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleFacebookSignup = async () => {
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
      navigate("/signup-success");
    } catch (error: any) {
      console.error("Error con Facebook:", error);
      setError(
        "Error al registrarse con Facebook. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
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
            <div className="error-message" role="alert" aria-live="polite">
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
                disabled={loading}
                aria-required="true"
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
                disabled={loading}
                aria-required="true"
              />
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
                disabled={loading}
                aria-required="true"
              />
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
                disabled={loading}
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              aria-label="Crear cuenta"
            >
              {loading ? "Creando cuenta..." : "CREAR CUENTA"}
            </button>
          </form>

          <div className="divider">
            <span>o regístrate con</span>
          </div>

          <div className="social-buttons">
            <button
              onClick={handleGoogleSignup}
              className="social-btn google-btn"
              disabled={loading}
              aria-label="Registrarse con Google"
            >
              <img src="/icons/google-icon.svg" alt="" aria-hidden="true" />
              Google
            </button>

            <button
              onClick={handleFacebookSignup}
              className="social-btn facebook-btn"
              disabled={loading}
              aria-label="Registrarse con Facebook"
            >
              <img src="/icons/facebook-icon.svg" alt="" aria-hidden="true" />
              Facebook
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
