import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../../lib/firebase.config";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import WebContentReader from '../../components/web-reader/WebContentReader';
import { useToastContext } from "../../contexts/ToastContext";
import "./ResetPassword.scss";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(true);
  const [codeValid, setCodeValid] = useState(false);
  const [email, setEmail] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const validateCode = async () => {
      if (!oobCode) {
        toast.error("Código de restablecimiento inválido o expirado");
        setValidatingCode(false);
        return;
      }

      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setCodeValid(true);
      } catch (error: any) {
        console.error("Error validating code:", error);
        toast.error("El enlace de restablecimiento es inválido o ha expirado");
      } finally {
        setValidatingCode(false);
      }
    };

    validateCode();
  }, [oobCode, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Inline password validation
    if (name === "password") {
      if (value.length > 0 && value.length < 6) {
        setPasswordError("La contraseña debe tener al menos 6 caracteres");
      } else {
        setPasswordError("");
      }
    }
    if (name === "confirmPassword") {
      if (value.length > 0 && value !== formData.password) {
        setPasswordError("Las contraseñas no coinciden");
      } else if (formData.password.length >= 6) {
        setPasswordError("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.password || !formData.confirmPassword) {
      toast.error("Por favor, completa todos los campos");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      if (!oobCode) {
        throw new Error("No code provided");
      }
      await confirmPasswordReset(auth, oobCode, formData.password);
      setSuccess(true);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.code === "auth/weak-password") {
        toast.error("La contraseña es muy débil");
      } else if (error.code === "auth/expired-action-code") {
        toast.error("El enlace ha expirado. Solicita uno nuevo");
      } else {
        toast.error(
          "Error al restablecer la contraseña. Por favor, intenta nuevamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  if (validatingCode) {
    return (
      <div className="reset-password-page">
        <WebContentReader />
        <Navbar showAuthButtons={false} />
        <main className="main-content">
          <div className="reset-card">
            <div
              className="loading-spinner"
              aria-label="Validando código"
            ></div>
            <p>Validando código de restablecimiento...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!codeValid) {
    return (
      <div className="reset-password-page">
        <WebContentReader />
        <a href="#main-content" className="skip-to-main">
          Saltar al contenido principal
        </a>

        <Navbar showAuthButtons={false} />

        <main id="main-content" className="main-content">
          <div className="reset-card">
            <div className="error-icon">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h1>Enlace inválido</h1>
            <p className="error-text">El enlace de restablecimiento es inválido o ha expirado</p>
            <a href="/recovery" className="back-btn">
              Solicitar nuevo enlace
            </a>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <WebContentReader />
        <a href="#main-content" className="skip-to-main">
          Saltar al contenido principal
        </a>

        <Navbar showAuthButtons={false} />

        <main id="main-content" className="main-content">
          <div className="reset-card">
            <div className="success-icon">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <h1>¡Contraseña restablecida!</h1>
            <p className="success-text">
              Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar
              sesión con tu nueva contraseña.
            </p>
            <button onClick={handleGoToLogin} className="continue-btn">
              INICIAR SESIÓN
            </button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      <Navbar showAuthButtons={false} />

      <main id="main-content" className="main-content">
        <div className="reset-card">
          <div className="logo-container">
            <div className="logo-icon" aria-hidden="true">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            </div>
          </div>

          <h1>Crear nueva contraseña</h1>
          <p className="subtitle">
            Ingresa tu nueva contraseña para <strong>{email}</strong>
          </p>

          <form onSubmit={handleSubmit} className="reset-form">
            <div className="form-group">
              <label htmlFor="password">Nueva contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                aria-required="true"
                autoFocus
              />
              {passwordError && formData.password.length > 0 && formData.password.length < 6 && (
                <span className="field-error">{passwordError}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu nueva contraseña"
                disabled={loading}
                aria-required="true"
              />
              {passwordError && formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                <span className="field-error">{passwordError}</span>
              )}
            </div>

            <div className="password-requirements">
              <h3>Requisitos de la contraseña:</h3>
              <ul>
                <li className={formData.password.length >= 6 ? "valid" : ""}>
                  Mínimo 6 caracteres
                </li>
                <li
                  className={
                    formData.password === formData.confirmPassword &&
                    formData.password
                      ? "valid"
                      : ""
                  }
                >
                  Las contraseñas coinciden
                </li>
              </ul>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              aria-label="Restablecer contraseña"
            >
              {loading ? "Restableciendo..." : "RESTABLECER CONTRASEÑA"}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
