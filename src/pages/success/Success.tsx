import React from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import WebContentReader from '../../components/web-reader/WebContentReader';
import "./Success.scss";

const Success: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleContinue = () => {
    navigate("/dashboard");
  };

  return (
    <div className="success-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      <Navbar showAuthButtons={false} />

      <main id="main-content" className="main-content">
        <div className="success-card">
          <div className="success-animation">
            <div className="checkmark-circle">
              <svg className="checkmark" viewBox="0 0 52 52">
                <circle
                  className="checkmark-circle-bg"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className="checkmark-check"
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
          </div>

          <h1>¡Bienvenido a Charlaton!</h1>
          <p className="welcome-message">
            {user?.displayName ? (
              <>
                Hola <strong>{user.displayName}</strong>, tu cuenta ha sido
                creada exitosamente.
              </>
            ) : (
              <>Tu cuenta ha sido creada exitosamente.</>
            )}
          </p>

          <div className="features-list" role="list" aria-label="Características principales de Charlaton">
            <div className="feature-item" role="listitem">
              <div className="feature-icon" aria-hidden="true">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Videollamadas HD ilimitadas</h3>
                <p>Conecta con tu equipo en alta calidad</p>
              </div>
            </div>

            <div className="feature-item" role="listitem">
              <div className="feature-icon" aria-hidden="true">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Seguridad garantizada</h3>
                <p>Tus datos protegidos con cifrado de extremo a extremo</p>
              </div>
            </div>

            <div className="feature-item" role="listitem">
              <div className="feature-icon" aria-hidden="true">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Resúmenes inteligentes</h3>
                <p>IA que resume tus reuniones automáticamente</p>
              </div>
            </div>
          </div>

          <div className="next-steps" aria-labelledby="next-steps-title">
            <h2 id="next-steps-title">Próximos pasos</h2>
            <ol>
              <li>Explora tu dashboard personalizado</li>
              <li>Configura tu perfil y preferencias</li>
              <li>Crea tu primera videollamada</li>
              <li>Invita a tu equipo a colaborar</li>
            </ol>
          </div>

          <button
            onClick={handleContinue}
            className="continue-btn"
            aria-label="Ir al dashboard"
          >
            IR A MI DASHBOARD
          </button>

          <p className="help-text">
            ¿Necesitas ayuda? Visita nuestro <a href="/help" aria-label="Ir al centro de ayuda">Centro de ayuda</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Success;
