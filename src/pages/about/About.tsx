import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./About.scss";

const About: React.FC = () => {
  return (
    <div className="about-page">
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      <Navbar />

      <main id="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1>
              Somos un equipo <span className="highlight">Apasionado</span>
            </h1>
            <p className="hero-subtitle">
              Comprometidos con transformar la forma en que las personas se
              conectan y colaboran en el mundo digital
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mission-section">
          <div className="container">
            <div className="mission-card">
              <h2>Nuestra Misión</h2>
              <p>
                En Charlaton, creemos que la comunicación efectiva es la clave
                del éxito. Nuestra misión es proporcionar una plataforma de
                videoconferencia de alta calidad que sea accesible, segura y
                fácil de usar para todos. Nos esforzamos por eliminar las
                barreras de la comunicación remota, permitiendo que equipos de
                todo el mundo colaboren como si estuvieran en la misma sala.
              </p>
              <p>
                Combinamos tecnología de vanguardia con un diseño intuitivo para
                crear experiencias de videollamada que van más allá de lo
                básico. Con funciones inteligentes impulsadas por IA, seguridad
                de nivel empresarial y una calidad de video superior, estamos
                redefiniendo lo que significa estar conectado.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">1M+</div>
                <div className="stat-label">Usuarios activos</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">99%</div>
                <div className="stat-label">Tiempo de actividad</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">50+</div>
                <div className="stat-label">Países</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Soporte</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="container">
            <h2>Todo lo que necesitas</h2>
            <p className="section-subtitle">
              Herramientas poderosas diseñadas para maximizar tu productividad
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                </div>
                <h3>Videollamadas HD</h3>
                <p>
                  Calidad de video y audio cristalina en alta definición para
                  reuniones profesionales sin interrupciones
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                </div>
                <h3>Seguridad</h3>
                <p>
                  Cifrado de extremo a extremo y protección de datos de nivel
                  empresarial para mantener tu privacidad
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                  </svg>
                </div>
                <h3>Resúmenes IA</h3>
                <p>
                  Inteligencia artificial que genera resúmenes automáticos de
                  tus reuniones para mayor productividad
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <h3>Acceso global</h3>
                <p>
                  Conéctate desde cualquier lugar del mundo con servidores
                  optimizados en múltiples regiones
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
                <h3>Colaboración fácil</h3>
                <p>
                  Herramientas intuitivas para compartir pantalla, pizarra
                  digital y trabajo en equipo eficiente
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                  </svg>
                </div>
                <h3>Chat integrado</h3>
                <p>
                  Sistema de mensajería instantánea para comunicación fluida
                  antes, durante y después de las llamadas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Restrictions Section */}
        <section className="restrictions-section">
          <div className="container">
            <h2>Restricciones y Políticas</h2>
            <p className="section-subtitle">
              Nuestro compromiso con una plataforma segura y respetuosa
            </p>

            <div className="restrictions-grid">
              <div className="restriction-card">
                <div className="restriction-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <h3>Contenido Prohibido</h3>
                <div className="restriction-content">
                  <p>
                    En Charlaton mantenemos una política de tolerancia cero
                    hacia contenidos inapropiados. Está estrictamente prohibido:
                  </p>
                  <ul>
                    <li>Contenido violento, de odio o discriminatorio</li>
                    <li>Acoso, intimidación o comportamiento abusivo</li>
                    <li>Material ilegal o que infrinja derechos de autor</li>
                    <li>Spam, phishing o actividades fraudulentas</li>
                    <li>Compartir información personal sin consentimiento</li>
                  </ul>
                  <p className="note">
                    El incumplimiento de estas normas resultará en la suspensión
                    inmediata de la cuenta.
                  </p>
                </div>
              </div>

              <div className="restriction-card">
                <div className="restriction-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <h3>Compromisos de calidad</h3>
                <div className="restriction-content">
                  <p>
                    Nos comprometemos a proporcionar un servicio de excelencia
                    garantizando:
                  </p>
                  <ul>
                    <li>99.9% de tiempo de actividad garantizado</li>
                    <li>
                      Actualizaciones regulares de seguridad y características
                    </li>
                    <li>Soporte técnico 24/7 en múltiples idiomas</li>
                    <li>Transparencia en el uso y protección de datos</li>
                    <li>Cumplimiento con GDPR, CCPA y regulaciones locales</li>
                  </ul>
                  <p className="note">
                    Tu confianza es nuestra prioridad. Trabajamos continuamente
                    para mejorar tu experiencia.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="container">
            <div className="cta-card">
              <h2>¿Listo para comenzar?</h2>
              <p>
                Únete a millones de usuarios que ya confían en Charlaton para
                sus comunicaciones
              </p>
              <div className="cta-buttons">
                <a href="/signup" className="btn-primary">
                  REGISTRARSE GRATIS
                </a>
                <a href="/login" className="btn-outline">
                  INICIAR SESIÓN
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
