import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import useAuthStore from '../../stores/useAuthStore';
import WebContentReader from '../../components/web-reader/WebContentReader';
import './Dashboard.scss';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const features = [
    {
      title: 'Iniciar Reunión',
      description: 'Crea una nueva videoconferencia instantánea',
      icon: '📹',
      action: () => navigate('/chat')
    },
    {
      title: 'Unirse a Reunión',
      description: 'Ingresa con un código de reunión',
      icon: '🔗',
      action: () => alert('Funcionalidad próximamente')
    },
    {
      title: 'Programar',
      description: 'Agenda reuniones futuras',
      icon: '📅',
      action: () => alert('Funcionalidad próximamente')
    },
    {
      title: 'Grabaciones',
      description: 'Accede a tus reuniones grabadas',
      icon: '🎬',
      action: () => alert('Funcionalidad próximamente')
    }
  ];

  const recentMeetings = [
    {
      title: 'Reunión de Equipo',
      date: 'Hoy, 10:00 AM',
      participants: 5,
      duration: '45 min'
    },
    {
      title: 'Presentación de Proyecto',
      date: 'Ayer, 3:00 PM',
      participants: 12,
      duration: '1h 20min'
    },
    {
      title: 'Revisión Semanal',
      date: '15 Nov, 2:00 PM',
      participants: 8,
      duration: '30 min'
    }
  ];

  return (
    <div className="dashboard-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>
      
      <Navbar showAuthButtons={true} onLogout={handleLogout} />
      
      <main id="main-content" className="dashboard-content">
        <div className="dashboard-container">
          {/* Welcome Section */}
          <section className="welcome-section" aria-labelledby="welcome-title">
            <h1 id="welcome-title">
              Bienvenido{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
            </h1>
            <p className="welcome-subtitle">
              ¿Qué te gustaría hacer hoy?
            </p>
          </section>

          {/* Quick Actions */}
          <section className="quick-actions" aria-labelledby="actions-title">
            <h2 id="actions-title" className="visually-hidden">Acciones rápidas</h2>
            <div className="actions-grid" role="list">
              {features.map((feature, index) => (
                <button
                  key={index}
                  className="action-card"
                  onClick={feature.action}
                  aria-label={`${feature.title}: ${feature.description}`}
                  role="listitem"
                >
                  <div className="action-icon" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <h3 className="action-title">{feature.title}</h3>
                  <p className="action-description">{feature.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Recent Meetings */}
          <section className="recent-meetings" aria-labelledby="recent-title">
            <h2 id="recent-title">Reuniones Recientes</h2>
            <div className="meetings-list" role="list">
              {recentMeetings.map((meeting, index) => (
                <article key={index} className="meeting-card" role="listitem">
                  <div className="meeting-header">
                    <h3 className="meeting-title">{meeting.title}</h3>
                    <span className="meeting-date">{meeting.date}</span>
                  </div>
                  <div className="meeting-details">
                    <span className="meeting-info">
                      <span aria-label={`${meeting.participants} participantes`} role="img">👥</span>
                      <span aria-hidden="true">{meeting.participants}</span>
                    </span>
                    <span className="meeting-info">
                      <span aria-label={`Duración: ${meeting.duration}`} role="img">⏱️</span>
                      <span aria-hidden="true">{meeting.duration}</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Stats Overview */}
          <section className="stats-overview" aria-labelledby="stats-title">
            <h2 id="stats-title" className="visually-hidden">Estadísticas de uso</h2>
            <div className="stats-grid" role="list">
              <div className="stat-card" role="listitem">
                <div className="stat-value" aria-label="12 reuniones este mes">12</div>
                <div className="stat-label" aria-hidden="true">Reuniones este mes</div>
              </div>
              <div className="stat-card" role="listitem">
                <div className="stat-value" aria-label="8 horas y 45 minutos de tiempo total">8h 45m</div>
                <div className="stat-label" aria-hidden="true">Tiempo total</div>
              </div>
              <div className="stat-card" role="listitem">
                <div className="stat-value" aria-label="24 contactos activos">24</div>
                <div className="stat-label" aria-hidden="true">Contactos activos</div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
