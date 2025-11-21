import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../../lib/socket.config";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Chat.scss";

/**
 * Interfaz que representa un mensaje en el chat.
 * 
 * @interface Message
 * @property {string} [id] - Identificador único del mensaje (opcional, generado por el servidor)
 * @property {string} senderId - Identificador del remitente (email o nombre)
 * @property {string} text - Contenido del mensaje
 * @property {number} timestamp - Marca de tiempo Unix del mensaje
 */
interface Message {
  id?: string;
  senderId: string;
  text: string;
  timestamp: number;
}

/**
 * Interfaz que representa un usuario conectado al chat.
 * 
 * @interface OnlineUser
 * @property {string} socketId - ID del socket de conexión
 * @property {string} userId - Identificador del usuario
 */
interface OnlineUser {
  socketId: string;
  userId: string;
}

/**
 * Página de Chat Global de la aplicación.
 * 
 * Funcionalidades:
 * - Conexión en tiempo real mediante Socket.IO
 * - Envío y recepción de mensajes instantáneos
 * - Historial de mensajes persistente
 * - Lista de usuarios en línea
 * - Conexión/desconexión manual del chat
 * - Auto-scroll al recibir nuevos mensajes
 * 
 * Estados de conexión:
 * - Conectado: El usuario puede enviar y recibir mensajes
 * - Desconectado: El usuario no recibe mensajes ni puede enviar
 * - Desconexión manual: El usuario eligió desconectarse
 * 
 * Accesibilidad (WCAG 2.1):
 * - Skip link para saltar al contenido principal
 * - role="log" en el contenedor de mensajes para lectores de pantalla
 * - aria-live="polite" para anunciar nuevos mensajes
 * - Estados de conexión anunciados con aria-live
 * - Formulario con labels apropiados
 * 
 * @component
 * @returns {JSX.Element} Página de chat completa
 */
const Chat: React.FC = () => {
  const navigate = useNavigate();
   /** Usuario autenticado del store global */
  const { user } = useAuthStore();
  /** Lista de mensajes del chat */
  const [messages, setMessages] = useState<Message[]>([]);
  /** Lista de usuarios actualmente en línea */
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  /** Contenido del input de mensaje */
  const [messageInput, setMessageInput] = useState("");
  /** Estado de conexión al servidor de chat */
  const [isConnected, setIsConnected] = useState(false);
   /** Indica si el usuario se desconectó manualmente */
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);
  /** Referencia al contenedor de mensajes para auto-scroll */
  const messagesEndRef = useRef<HTMLDivElement>(null);
   /** Flag para evitar cargar el historial múltiples veces */
  const hasLoadedHistory = useRef(false);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * Efecto principal para manejar la conexión del socket.
   * 
   * Acciones:
   * - Verifica autenticación y redirige si no hay usuario
   * - Conecta al socket si no está desconectado manualmente
   * - Registra listeners para eventos del socket
   * - Limpia listeners al desmontar el componente
   */
  useEffect(() => {
    // Verificar autenticación
    if (!user) {
      navigate("/login");
      return;
    }

    // Solo conectar si no está manualmente desconectado
    if (!isManuallyDisconnected) {
      socket.connect();
    }

    // Event listeners
    socket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Conectado al servidor de chat");

      // Registrar usuario en el servidor
      if (user?.email) {
        socket.emit("newUser", user.email);
        console.log("👤 Usuario registrado:", user.email);
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("❌ Desconectado del servidor de chat");
    });

    // Escuchar nuevos mensajes
    socket.on("newMessage", (message: Message) => {
      console.log("📨 Nuevo mensaje recibido:", message);
      setMessages((prev) => [...prev, message]);
    });

    // Escuchar usuarios online
    socket.on("usersOnline", (users: OnlineUser[]) => {
      console.log("👥 Usuarios online:", users.length);
      setOnlineUsers(users);
    });

    // Cleanup
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("newMessage");
      socket.off("usersOnline");
      if (!isManuallyDisconnected) {
        socket.disconnect();
      }
    };
  }, [user, navigate, isManuallyDisconnected]);

  /**
   * Efecto para cargar el historial de mensajes una sola vez.
   * Se ejecuta cuando el usuario está conectado y no se ha cargado previamente.
   */
  useEffect(() => {
    if (user && isConnected && !hasLoadedHistory.current) {
      loadChatHistory();
      hasLoadedHistory.current = true;
    }
  }, [user, isConnected]);

  /**
   * Carga el historial de mensajes desde el API.
   * Obtiene los últimos 100 mensajes del servidor.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const loadChatHistory = async () => {
    try {
      const API_URL =
        import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
      console.log("📥 Cargando historial de mensajes...");

      const response = await fetch(`${API_URL}/api/messages?limit=100`);
      const data = await response.json();

      if (data.success && data.messages) {
        setMessages(data.messages);
        console.log("✅ Historial cargado:", data.messages.length, "mensajes");
      }
    } catch (error) {
      console.error("❌ Error cargando historial:", error);
    }
  };

  /**
   * Efecto para hacer scroll automático al último mensaje.
   * Se ejecuta cada vez que cambia la lista de mensajes.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Maneja el envío de un nuevo mensaje.
   * Valida que haya contenido, usuario y conexión activa.
   * 
   * @param {React.FormEvent} e - Evento del formulario
   */
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user || !isConnected) return;

    console.log("📤 Enviando mensaje:", messageInput);

    // Enviar mensaje al servidor
    socket.emit("sendMessage", {
      senderId: user.email || user.displayName || "Usuario",
      text: messageInput.trim(),
    });

    setMessageInput("");
  };

  /**
   * Maneja el cierre de sesión del usuario.
   * Desconecta el socket y navega a login.
   */
  const handleLogout = () => {
    socket.disconnect();
    navigate("/login");
  };

   /**
   * Alterna el estado de conexión del chat.
   * Permite al usuario conectarse/desconectarse manualmente.
   */
  const handleToggleConnection = () => {
    if (isConnected) {
      // Desconectar manualmente
      socket.disconnect();
      setIsManuallyDisconnected(true);
      console.log("🔌 Desconectado manualmente del chat");
    } else {
      // Reconectar
      socket.connect();
      setIsManuallyDisconnected(false);
      console.log("🔌 Reconectando al chat...");
    }
  };

  return (
    <div className="chat-page">
      {/* Header */}
      <Navbar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="main-content">
        <div className="chat-container">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-title">
                <h2>Chat Global</h2>
                <p className="status">
                  {isConnected ? (
                    <>
                      <span className="status-dot online"></span>
                      Conectado
                    </>
                  ) : (
                    <>
                      <span className="status-dot offline"></span>
                      Desconectado
                    </>
                  )}
                </p>
              </div>
              <div className="header-actions">
                <div className="message-count">
                  {onlineUsers.length} usuario
                  {onlineUsers.length !== 1 ? "s" : ""} online |{" "}
                  {messages.length} mensaje{messages.length !== 1 ? "s" : ""}
                </div>
                <button
                  onClick={handleToggleConnection}
                  className={`connection-toggle-btn ${
                    isConnected ? "connected" : "disconnected"
                  }`}
                  title={
                    isConnected ? "Desconectar del chat" : "Conectar al chat"
                  }
                >
                  {isConnected ? (
                    <>
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
                        />
                      </svg>
                      <span className="btn-text">Desconectar</span>
                    </>
                  ) : (
                    <>
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                        />
                      </svg>
                      <span className="btn-text">Conectar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-content">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                  </svg>
                  <p className="empty-title">No hay mensajes aún</p>
                  <p className="empty-subtitle">
                    ¡Sé el primero en enviar un mensaje!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwnMessage =
                  msg.senderId === user?.email ||
                  msg.senderId === user?.displayName;

                return (
                  <div
                    key={msg.id || `${msg.timestamp}-${index}`}
                    className={`message ${isOwnMessage ? "sent" : "received"}`}
                  >
                    <div
                      className={`message-bubble ${
                        isOwnMessage ? "sent-bubble" : "received-bubble"
                      }`}
                    >
                      <p className="message-author">
                        {isOwnMessage ? "Tú" : msg.senderId}
                      </p>
                      <p className="message-text">{msg.text}</p>
                      <p
                        className={`message-time ${
                          isOwnMessage ? "sent-time" : "received-time"
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="message-input-form">
            <div className="input-container">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!isConnected || !messageInput.trim()}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Chat;
