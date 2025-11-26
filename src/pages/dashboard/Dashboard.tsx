import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import useAuthStore from "../../stores/useAuthStore";
import WebContentReader from "../../components/web-reader/WebContentReader";
import Toast from "../../components/Toast/Toast";
import { createRoom, getRoomById, getUserRooms, getUserStats } from "../../services/room.service";
import "./Dashboard.scss";

interface ToastState {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

let toastIdCounter = 0;

const Dashboard: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const shownToastsRef = useRef<Set<string>>(new Set());
  const [joinMeetingId, setJoinMeetingId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  
  // Recent meetings state
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  
  // Stats state
  const [stats, setStats] = useState({
    meetingsThisMonth: 0,
    totalDuration: "0min",
    activeContacts: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" | "warning" = "info"
    ) => {
      // Verificar si ya se mostró este toast
      if (shownToastsRef.current.has(message)) {
        return;
      }

      const id = ++toastIdCounter;
      setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
      shownToastsRef.current.add(message);
    },
    []
  );

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Handle creating a new instant meeting
   * Creates a room and navigates to it
   */
  const handleStartMeeting = async () => {
    if (!user?.id) {
      showToast("Debes iniciar sesión para crear una reunión", "error");
      return;
    }

    try {
      console.log("[DASHBOARD] Creating new meeting");
      const roomData = {
        name: `Reunión de ${user.displayName || user.nickname || user.email}`,
        creatorId: user.id,
        private: false,
      };

      const response = await createRoom(roomData);

      if (response.error) {
        showToast(response.error, "error");
        return;
      }

      if (response.data?.id) {
        console.log(`[DASHBOARD] Meeting created with ID: ${response.data.id}`);
        navigate(`/meet/${response.data.id}`);
      }
    } catch (error) {
      console.error("[DASHBOARD] Error creating meeting:", error);
      showToast("Error al crear la reunión", "error");
    }
  };

  /**
   * Handle joining a meeting by ID
   * Validates the meeting ID and navigates to the meeting
   */
  const handleJoinMeeting = async () => {
    const meetingId = joinMeetingId.trim();

    if (!meetingId) {
      showToast("Por favor ingresa un código de reunión", "warning");
      return;
    }

    if (!user?.id) {
      showToast("Debes iniciar sesión para unirte a una reunión", "error");
      return;
    }

    setIsJoining(true);

    try {
      console.log(`[DASHBOARD] Validating meeting ID: ${meetingId}`);
      const response = await getRoomById(meetingId);

      if (response.error) {
        showToast(
          "Reunión no encontrada. Verifica el código e intenta de nuevo.",
          "error"
        );
        setIsJoining(false);
        return;
      }

      console.log(`[DASHBOARD] Meeting ${meetingId} found, navigating...`);
      navigate(`/meet/${meetingId}`);
    } catch (error) {
      console.error("[DASHBOARD] Error joining meeting:", error);
      showToast("Error al unirse a la reunión", "error");
      setIsJoining(false);
    }
  };

  const renderIcon = (iconType: string) => {
    switch (iconType) {
      case "video":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        );
      case "link":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        );
      case "calendar":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "summary":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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

  /**
   * Load user's recent meetings
   */
  const loadRecentMeetings = useCallback(async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingMeetings(true);
    try {
      const response = await getUserRooms(user.id, page, 3);
      
      if (response.error) {
        console.error("[DASHBOARD] Error loading meetings:", response.error);
        setRecentMeetings([]);
        return;
      }
      
      if (response.data) {
        setRecentMeetings(response.data.rooms || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setCurrentPage(response.data.pagination?.currentPage || 1);
        console.log(`[DASHBOARD] Loaded ${response.data.rooms?.length || 0} meetings`);
      }
    } catch (error) {
      console.error("[DASHBOARD] Error loading meetings:", error);
      setRecentMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  }, [user?.id]);

  /**
   * Load user statistics
   */
  const loadUserStats = useCallback(async () => {
    if (!user?.id) {
      console.log("[DASHBOARD] No user ID, skipping stats load");
      return;
    }

    try {
      setLoadingStats(true);
      console.log(`[DASHBOARD] Loading stats for user ${user.id}`);
      
      const response = await getUserStats(user.id);
      
      if (response.error) {
        console.error("[DASHBOARD] Error loading stats:", response.error);
        showToast(`Error al cargar estadísticas: ${response.error}`, "error");
        return;
      }

      if (response.data) {
        setStats({
          meetingsThisMonth: response.data.meetingsThisMonth || 0,
          totalDuration: response.data.totalDuration || "0min",
          activeContacts: response.data.activeContacts || 0,
        });
        console.log("[DASHBOARD] Stats loaded:", response.data);
      }
    } catch (error) {
      console.error("[DASHBOARD] Error in loadUserStats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, [user?.id, showToast]);

  // Load meetings and stats on mount and when user changes
  useEffect(() => {
    loadRecentMeetings(1);
    loadUserStats();
  }, [loadRecentMeetings, loadUserStats]);

  /**
   * Format timestamp to readable date
   */
  const formatMeetingDate = (timestamp: any): string => {
    if (!timestamp) return "Fecha desconocida";
    
    try {
      let date: Date;
      
      // Handle different timestamp formats
      if (typeof timestamp === 'string') {
        // ISO string format: "2025-11-25T23:12:00.000Z"
        date = new Date(timestamp);
      } else if (timestamp._seconds || timestamp.seconds) {
        // Firestore Timestamp format
        const seconds = timestamp._seconds || timestamp.seconds;
        date = new Date(seconds * 1000);
      } else if (typeof timestamp === 'number') {
        // Unix timestamp in milliseconds or seconds
        date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
      } else {
        console.warn("[DASHBOARD] Unknown timestamp format:", timestamp);
        return "Fecha desconocida";
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        console.error("[DASHBOARD] Invalid date:", timestamp);
        return "Fecha inválida";
      }
      
      // Calculate days difference based on calendar days, not 24-hour periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const meetingDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffMs = today.getTime() - meetingDay.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (diffDays === 1) {
        return `Ayer, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (diffDays < 7) {
        const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' });
        const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${time}`;
      } else {
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      console.error("[DASHBOARD] Error formatting date:", e, timestamp);
      return "Fecha desconocida";
    }
  };

  /**
   * Format duration in minutes to readable string
   */
  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes <= 0) return "Sin datos";
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins} min`;
  };

  /**
   * Format participants count
   */
  const formatParticipants = (count: number): string => {
    if (!count || count <= 0) return "Sin participantes";
    return count === 1 ? "1 participante" : `${count} participantes`;
  };

  const features = [
    {
      title: "Iniciar Reunión",
      description: "Crea una nueva videoconferencia instantánea",
      icon: "video",
      action: handleStartMeeting,
    },
    {
      title: "Unirse a Reunión",
      description: "Ingresa con un código de reunión",
      icon: "link",
      action: () => {
        // Scroll to join meeting input
        document.getElementById("join-meeting-input")?.focus();
      },
    },
    {
      title: "Programar",
      description: "Agenda reuniones futuras",
      icon: "calendar",
      action: () => showToast("Funcionalidad próximamente", "info"),
    },
    {
      title: "Resúmenes",
      description: "Revisa los resúmenes de tus reuniones",
      icon: "summary",
      action: () => showToast("Funcionalidad próximamente", "info"),
    },
  ];

  return (
    <div className="dashboard-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      <Navbar showAuthButtons={false} onLogout={handleLogout} />

      <main id="main-content" className="dashboard-content">
        <div className="dashboard-container">
          {/* Welcome Section */}
          <section className="welcome-section" aria-labelledby="welcome-title">
            <h1 id="welcome-title">
              Bienvenido
              {user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
            </h1>
            <p className="welcome-subtitle">¿Qué te gustaría hacer hoy?</p>
          </section>

          {/* Quick Actions */}
          <section className="quick-actions" aria-labelledby="actions-title">
            <h2 id="actions-title" className="visually-hidden">
              Acciones rápidas
            </h2>
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

          {/* Join Meeting Section */}
          <section
            className="join-meeting-section"
            aria-labelledby="join-meeting-title"
          >
            <h2 id="join-meeting-title">Unirse a una Reunión</h2>
            <p className="join-meeting-description">
              Ingresa el código de reunión para unirte
            </p>
            <div className="join-meeting-form">
              <input
                id="join-meeting-input"
                type="text"
                className="join-meeting-input"
                placeholder="Código de reunión (ej: abc123xyz)"
                value={joinMeetingId}
                onChange={(e) => setJoinMeetingId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isJoining) {
                    handleJoinMeeting();
                  }
                }}
                disabled={isJoining}
                aria-label="Código de reunión"
                aria-describedby="join-meeting-help"
              />
              <button
                className="join-meeting-button"
                onClick={handleJoinMeeting}
                disabled={isJoining || !joinMeetingId.trim()}
                aria-label="Unirse a la reunión"
              >
                {isJoining ? (
                  <>
                    <svg
                      className="spinner"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        opacity="0.25"
                      />
                      <path
                        d="M12 2 A10 10 0 0 1 22 12"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                    Uniéndose...
                  </>
                ) : (
                  "Unirse"
                )}
              </button>
            </div>
            <p id="join-meeting-help" className="join-meeting-help">
              El código de reunión es proporcionado por el organizador
            </p>
          </section>

          {/* Recent Meetings */}
          <section className="recent-meetings" aria-labelledby="recent-title">
            <div className="recent-meetings-header">
              <h2 id="recent-title">Reuniones Recientes</h2>
              {totalPages > 1 && (
                <div className="pagination-info">
                  Página {currentPage} de {totalPages}
                </div>
              )}
            </div>
            
            {loadingMeetings ? (
              <div className="meetings-loading">
                <div className="spinner" aria-label="Cargando reuniones"></div>
                <p>Cargando reuniones...</p>
              </div>
            ) : recentMeetings.length === 0 ? (
              <div className="meetings-empty">
                <p>No tienes reuniones recientes.</p>
                <p className="empty-subtitle">Crea tu primera reunión para comenzar</p>
              </div>
            ) : (
              <>
                <div className="meetings-list" role="list">
                  {recentMeetings.map((meeting) => (
                    <article 
                      key={meeting.id} 
                      className="meeting-card" 
                      role="listitem"
                      onClick={() => navigate(`/meet/${meeting.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="meeting-header">
                        <h3 className="meeting-title">{meeting.name}</h3>
                        <span className="meeting-date">{formatMeetingDate(meeting.createdAt)}</span>
                      </div>
                      <div className="meeting-details">
                        <span className="meeting-info">
                          <svg
                            className="meeting-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          {formatParticipants(meeting.participants)}
                        </span>
                        <span className="meeting-info">
                          <svg
                            className="meeting-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          {formatDuration(meeting.duration)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination-controls" role="navigation" aria-label="Paginación de reuniones">
                    <button
                      className="pagination-button"
                      onClick={() => loadRecentMeetings(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Página anterior"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                      Anterior
                    </button>
                    
                    <span className="pagination-current" aria-current="page">
                      {currentPage} / {totalPages}
                    </span>
                    
                    <button
                      className="pagination-button"
                      onClick={() => loadRecentMeetings(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Página siguiente"
                    >
                      Siguiente
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Stats Overview */}
          <section className="stats-overview" aria-labelledby="stats-title">
            <h2 id="stats-title" className="visually-hidden">
              Estadísticas de uso
            </h2>
            <div className="stats-grid" role="list">
              <div className="stat-card" role="listitem">
                <div className="stat-value" aria-label={`${stats.meetingsThisMonth} reuniones este mes`}>
                  {loadingStats ? "..." : stats.meetingsThisMonth}
                </div>
                <div className="stat-label" aria-hidden="true">
                  Reuniones este mes
                </div>
              </div>
              <div className="stat-card" role="listitem">
                <div
                  className="stat-value"
                  aria-label={`${stats.totalDuration} de tiempo total`}
                >
                  {loadingStats ? "..." : stats.totalDuration}
                </div>
                <div className="stat-label" aria-hidden="true">
                  Tiempo total
                </div>
              </div>
              <div className="stat-card" role="listitem">
                <div className="stat-value" aria-label={`${stats.activeContacts} contactos activos`}>
                  {loadingStats ? "..." : stats.activeContacts}
                </div>
                <div className="stat-label" aria-hidden="true">
                  Contactos activos
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />

      {/* Toast Notifications */}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
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
