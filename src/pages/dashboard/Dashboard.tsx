import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import useAuthStore from '../../stores/useAuthStore';
import WebContentReader from '../../components/web-reader/WebContentReader';
import Toast from '../../components/Toast/Toast';
import './Dashboard.scss';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

let toastIdCounter = 0;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [shownToasts, setShownToasts] = useState<Set<string>>(new Set());

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setShownToasts(prev => {
      // Verificar si ya se mostró este toast
      if (prev.has(message)) {
        return prev;
      }
      
      const id = ++toastIdCounter;
      setToasts(prevToasts => [...prevToasts, { id, message, type }]);
      return new Set([...prev, message]);
    });
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const renderIcon = (iconType: string) => {
    switch (iconType) {
      case 'video':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        );
      case 'link':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        );
      case 'calendar':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case 'summary':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      default:
        return null;
    }
  };

  const features = [
    {
      title: 'Iniciar Reunión',
      description: 'Crea una nueva videoconferencia instantánea',
      icon: 'video',
      action: () => navigate('/chat')
    },
    {
      title: 'Unirse a Reunión',
      description: 'Ingresa con un código de reunión',
      icon: 'link',
      action: () => showToast('Funcionalidad próximamente', 'info')
    },
    {
      title: 'Programar',
      description: 'Agenda reuniones futuras',
      icon: 'calendar',
      action: () => showToast('Funcionalidad próximamente', 'info')
    },
    {
      title: 'Resúmenes',
      description: 'Revisa los resúmenes de tus reuniones',
      icon: 'summary',
      action: () => showToast('Funcionalidad próximamente', 'info')
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
                    {renderIcon(feature.icon)}
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
                      <svg className="meeting-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      {meeting.participants} participantes
                    </span>
                    <span className="meeting-info">
                      <svg className="meeting-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {meeting.duration}
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
      
      {/* Toast Notifications */}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
