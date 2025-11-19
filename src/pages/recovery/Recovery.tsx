import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase.config";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Recovery.scss";

const Recovery: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Por favor, ingresa tu correo electrónico");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error: any) {
      console.error("Error al enviar correo:", error);
      if (error.code === "auth/user-not-found") {
        setError("No existe una cuenta con este correo electrónico");
      } else if (error.code === "auth/invalid-email") {
        setError("Correo electrónico inválido");
      } else {
        setError("Error al enviar el correo. Por favor, intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recovery-page">
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

          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" role="alert" aria-live="polite">
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
                  disabled={loading}
                  aria-required="true"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
                aria-label="Enviar enlace de recuperación"
              >
                {loading ? "Enviando..." : "ENVIAR ENLACE DE RECUPERACIÓN"}
              </button>

              <a href="/login" className="back-link">
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
