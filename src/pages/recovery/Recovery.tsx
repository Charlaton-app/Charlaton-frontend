import React, { useState, useEffect } from "react";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import WebContentReader from "../../components/web-reader/WebContentReader";
import { useToastContext } from "../../contexts/ToastContext";
import "./Recovery.scss";

const Recovery: React.FC = () => {
  const toast = useToastContext();
  const { recoverPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (!email) {
      toast.error("Por favor, ingresa tu correo electrónico");
      return;
    }

    const result = await recoverPassword(email);
    if (result.success) {
      setSuccess(true);
    } else {
      toast.error(result.error || "Error al enviar el correo");
    }
  };

  return (
    <div className="recovery-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      <Navbar showAuthButtons={false} />

      <main id="main-content" className="main-content">
        <div className="recovery-card">
          <div className="logo-container">
            <div className="logo-icon" aria-hidden="true">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
          </div>

          <h1>¿Olvidaste tu contraseña?</h1>
          <p className="subtitle">
            Ingresa tu correo electrónico y te enviaremos instrucciones para
            restablecer tu contraseña
          </p>

          {success && (
            <div
              className="success-message"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="success-icon">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </div>
              <h3>¡Correo enviado!</h3>
              <p>
                Hemos enviado un enlace de recuperación a{" "}
                <strong>{email}</strong>. Por favor revisa tu bandeja de entrada
                y sigue las instrucciones.
              </p>
              <p className="note">
                Si no recibes el correo en unos minutos, verifica tu carpeta de
                spam.
              </p>
              <a href="/login" className="back-btn">
                Volver al inicio de sesión
              </a>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="recovery-form">
              <div className="form-group">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@ejemplo.com"
                  disabled={isLoading}
                  aria-required="true"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={isLoading}
                aria-label="Enviar enlace de recuperación"
              >
                {isLoading ? "Enviando..." : "ENVIAR ENLACE DE RECUPERACIÓN"}
              </button>

              <a
                href="/login"
                className="back-link"
                aria-label="Regresar a la página de inicio de sesión"
              >
                ← Volver al inicio de sesión
              </a>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Recovery;
