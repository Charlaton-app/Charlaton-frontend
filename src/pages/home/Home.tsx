import React, { useState } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import './Home.scss';

const Home: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      question: '¿Cómo me registro?',
      answer: 'Crear una cuenta en Charlaton es muy sencillo. Haz clic en el botón "REGISTRARSE" en la parte superior, completa el formulario con tus datos o inicia sesión con Google o Facebook. Recibirás un correo de confirmación y podrás comenzar a usar la plataforma de inmediato.'
    },
    {
      question: '¿Dónde y cómo puedo unirme?',
      answer: 'Una vez registrado, puedes unirte a videoconferencias desde cualquier dispositivo con conexión a internet. Solo necesitas el enlace de la reunión o el código de acceso que te proporcione el organizador. Ingresa desde tu navegador web sin necesidad de descargar software adicional.'
    },
    {
      question: '¿Cuánto debo pagar?',
      answer: 'Charlaton ofrece un plan gratuito con funcionalidades básicas para reuniones de hasta 40 minutos. También contamos con planes Premium mensuales y anuales que incluyen reuniones ilimitadas, grabación en la nube, mayor capacidad de participantes y funciones avanzadas de colaboración.'
    },
    {
      question: '¿Es seguro usar la plataforma?',
      answer: 'La seguridad es nuestra prioridad. Todas las videoconferencias están protegidas con cifrado de extremo a extremo. Además, ofrecemos salas con contraseña, sala de espera para admitir participantes, y cumplimos con las normativas internacionales de protección de datos y privacidad.'
    }
  ];

  const stats = [
    { value: '1M+', label: 'Usuarios activos' },
    { value: '99%', label: 'Tiempo activo' },
    { value: '50+', label: 'Países' },
    { value: '24/7', label: 'Soporte' }
  ];

  const steps = [
    {
      number: 1,
      title: 'Crea tu cuenta',
      description: 'Regístrate de forma gratuita'
    },
    {
      number: 2,
      title: 'Videoconferencia',
      description: 'Inicia o únete a reuniones'
    },
    {
      number: 3,
      title: 'Invita a tu equipo',
      description: 'Comparte el enlace'
    },
    {
      number: 4,
      title: 'Comienza a colaborar',
      description: 'Trabaja en conjunto'
    }
  ];

  return (
    <div className="home-page">
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>
      
      <Navbar showAuthButtons={true} />
      
      <main id="main-content">
        {/* Hero Section */}
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-container">
            <div className="hero-content">
              <h1 id="hero-title">
                Conecta con tu equipo de forma sencilla
              </h1>
              <p className="hero-description">
                Videoconferencia profesional en HD. Una plataforma moderna 
                para tus reuniones virtuales. Todo lo que necesitas en un 
                solo lugar.
              </p>
              <button className="cta-button" aria-label="Comenzar a usar Charlaton">
                COMIENZA YA
              </button>
            </div>
            <div className="hero-image">
              <img 
                src="/social-picture.svg" 
                alt="Personas colaborando en videoconferencia" 
                role="img"
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section" aria-label="Estadísticas de Charlaton">
          <div className="stats-container">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value" aria-label={`${stat.value} ${stat.label}`}>
                  {stat.value}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Steps Section */}
        <section className="steps-section" aria-labelledby="steps-title">
          <h2 id="steps-title">En pocos pasos</h2>
          <div className="steps-container">
            {steps.map((step) => (
              <div key={step.number} className="step-item">
                <div 
                  className="step-number" 
                  aria-label={`Paso ${step.number}`}
                >
                  {step.number}
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section" aria-labelledby="faq-title">
          <h2 id="faq-title">Preguntas frecuentes</h2>
          <div className="faq-container">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaqIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span>{faq.question}</span>
                  <span 
                    className={`faq-icon ${openFaqIndex === index ? 'open' : ''}`}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </button>
                {openFaqIndex === index && (
                  <div 
                    id={`faq-answer-${index}`}
                    className="faq-answer"
                    role="region"
                  >
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
