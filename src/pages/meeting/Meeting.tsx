// src/pages/meeting/Meeting.tsx
// Meeting page with Google Meet-style UI, participants, and real-time chat

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import WebContentReader from "../../components/web-reader/WebContentReader";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import {
  getRoomById,
  joinRoom,
  leaveRoom,
  deleteRoom,
  getRoomParticipants,
  type Participant,
} from "../../services/room.service";
import {
  getRoomMessages,
  sendMessage,
  type Message,
} from "../../services/message.service";
import { socket } from "../../lib/socket.config";
import "./Meeting.scss";

const Meeting: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEndModal, setShowEndModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /**
   * Load room data and join
   */
  useEffect(() => {
    const initializeMeeting = async () => {
      if (!meetingId || !user?.id) {
        setError("ID de reunión o usuario no válido");
        setLoading(false);
        return;
      }

      console.log(`[MEETING] Initializing meeting ${meetingId}`);

      try {
        // Get room details
        const roomResponse = await getRoomById(meetingId);
        if (roomResponse.error || !roomResponse.data) {
          setError("Reunión no encontrada");
          setLoading(false);
          return;
        }

        setRoom(roomResponse.data);
        setIsHost(roomResponse.data.creatorId === user.id);

        // Join room
        const joinResponse = await joinRoom(meetingId, user.id);
        if (joinResponse.error) {
          setError(joinResponse.error);
          setLoading(false);
          return;
        }

        setConnectionId(joinResponse.data?.id);

        // Load participants
        const participantsResponse = await getRoomParticipants(meetingId);
        if (!participantsResponse.error && participantsResponse.data) {
          setParticipants(participantsResponse.data);
        }

        // Load messages
        const messagesResponse = await getRoomMessages(meetingId);
        if (!messagesResponse.error && messagesResponse.data) {
          setMessages(messagesResponse.data);
        }

        setLoading(false);
      } catch (err) {
        console.error("[MEETING] Error initializing meeting:", err);
        setError("Error al unirse a la reunión");
        setLoading(false);
      }
    };

    initializeMeeting();
  }, [meetingId, user?.id]);

  /**
   * Setup Socket.io listeners
   */
  useEffect(() => {
    if (!meetingId || !user?.id) return;

    console.log("[MEETING] Setting up Socket.io listeners");
    socket.connect();

    // Join room in socket
    socket.emit("joinRoom", { roomId: meetingId, userId: user.id });

    // Listen for new participants
    socket.on("userJoined", (data: any) => {
      console.log("[MEETING] User joined:", data);
      setParticipants((prev) => [...prev, data.participant]);
    });

    // Listen for participants leaving
    socket.on("userLeft", (data: any) => {
      console.log("[MEETING] User left:", data);
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    // Listen for new messages
    socket.on("newMessage", (message: Message) => {
      console.log("[MEETING] New message received:", message);
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    // Listen for meeting end
    socket.on("meetingEnded", () => {
      console.log("[MEETING] Meeting ended by host");
      alert("La reunión ha sido finalizada por el anfitrión");
      navigate("/dashboard");
    });

    return () => {
      console.log("[MEETING] Cleaning up Socket.io listeners");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("newMessage");
      socket.off("meetingEnded");
    };
  }, [meetingId, user?.id, navigate, scrollToBottom]);

  /**
   * Auto-scroll when new messages arrive
   */
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !meetingId || !user?.id) return;

    try {
      const response = await sendMessage({
        userId: user.id,
        roomId: meetingId,
        content,
        visibility: "public",
      });

      if (response.error) {
        console.error("[MEETING] Error sending message:", response.error);
        return;
      }

      // Emit to socket for real-time update
      socket.emit("sendMessage", {
        roomId: meetingId,
        message: response.data,
      });

      setMessageInput("");
      chatInputRef.current?.focus();
    } catch (err) {
      console.error("[MEETING] Error sending message:", err);
    }
  };

  /**
   * Handle leaving the meeting
   */
  const handleLeaveMeeting = async () => {
    if (!user?.id || !meetingId) return;

    try {
      await leaveRoom(user.id, meetingId);

      // Emit to socket
      socket.emit("leaveRoom", {
        roomId: meetingId,
        userId: user.id,
      });

      socket.disconnect();
      navigate("/dashboard");
    } catch (err) {
      console.error("[MEETING] Error leaving meeting:", err);
    }
  };

  /**
   * Handle ending the meeting (host only)
   */
  const handleEndMeeting = async () => {
    if (!isHost || !meetingId) return;

    try {
      await deleteRoom(meetingId);

      // Emit to socket to notify all participants
      socket.emit("endMeeting", { roomId: meetingId });

      socket.disconnect();
      navigate("/dashboard");
    } catch (err) {
      console.error("[MEETING] Error ending meeting:", err);
    }
  };

  /**
   * Handle copying meeting link
   */
  const handleCopyLink = async () => {
    const meetingLink = `${window.location.origin}/join/${meetingId}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(meetingLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = meetingLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch (err) {
      console.error("[MEETING] Error copying link:", err);
      alert(`Enlace de reunión: ${meetingLink}`);
    }
  };

  if (loading) {
    return (
      <div className="meeting-page loading">
        <div className="spinner-container">
          <div className="spinner" aria-label="Cargando reunión"></div>
          <p>Cargando reunión...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="meeting-page error">
        <div className="error-container">
          <h1>Error</h1>
          <p>{error}</p>
          <button onClick={() => navigate("/dashboard")}>
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-page">
      <WebContentReader />

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showEndModal}
        title="Finalizar reunión"
        message="¿Estás seguro de que deseas finalizar la reunión para todos los participantes? Esta acción no se puede deshacer."
        confirmText="Finalizar"
        cancelText="Cancelar"
        confirmButtonClass="btn-danger"
        delaySeconds={0}
        onConfirm={handleEndMeeting}
        onCancel={() => setShowEndModal(false)}
      />

      <ConfirmationModal
        isOpen={showLeaveModal}
        title="Salir de la reunión"
        message={
          isHost
            ? "Eres el anfitrión. Si sales, la reunión continuará pero sin ti. ¿Deseas salir?"
            : "¿Estás seguro de que deseas salir de la reunión?"
        }
        confirmText="Salir"
        cancelText="Cancelar"
        confirmButtonClass="btn-confirm"
        delaySeconds={0}
        onConfirm={handleLeaveMeeting}
        onCancel={() => setShowLeaveModal(false)}
      />

      {/* Meeting Header */}
      <header className="meeting-header">
        <div className="meeting-info">
          <h1 className="meeting-title">{room?.name || "Reunión"}</h1>
          <span className="meeting-id">ID: {meetingId}</span>
        </div>

        <div className="meeting-actions">
          <button
            className="action-btn copy-link"
            onClick={handleCopyLink}
            aria-label="Copiar enlace de reunión"
            title="Copiar enlace"
          >
            {copiedLink ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                ¡Copiado!
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Copiar enlace
              </>
            )}
          </button>

          {isHost && (
            <button
              className="action-btn end-meeting"
              onClick={() => setShowEndModal(true)}
              aria-label="Finalizar reunión"
              title="Finalizar reunión"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Finalizar
            </button>
          )}

          <button
            className="action-btn leave-meeting"
            onClick={() => setShowLeaveModal(true)}
            aria-label="Salir de la reunión"
            title="Salir"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        </div>
      </header>

      {/* Meeting Content */}
      <div className="meeting-content">
        {/* Main Video Area */}
        <div className="video-area">
          <div className="video-grid">
            {/* Video placeholder - can be replaced with actual video streams */}
            {participants.map((participant) => (
              <div key={participant.id} className="video-tile">
                <div className="participant-avatar">
                  {(participant.user?.displayName ||
                    participant.user?.nickname ||
                    participant.user?.email ||
                    "U")[0].toUpperCase()}
                </div>
                <div className="participant-info">
                  <span className="participant-name">
                    {participant.user?.displayName ||
                      participant.user?.nickname ||
                      participant.user?.email}
                    {participant.userId === room?.creatorId && " (Anfitrión)"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Meeting Controls */}
          <div className="meeting-controls">
            <button
              className="control-btn"
              aria-label="Silenciar micrófono"
              title="Silenciar"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            <button
              className="control-btn"
              aria-label="Desactivar cámara"
              title="Cámara"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>

            <button
              className={`control-btn ${showChat ? "active" : ""}`}
              onClick={() => setShowChat(!showChat)}
              aria-label="Abrir chat"
              title="Chat"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {messages.length > 0 && (
                <span className="badge">{messages.length}</span>
              )}
            </button>

            <button
              className={`control-btn ${showParticipants ? "active" : ""}`}
              onClick={() => setShowParticipants(!showParticipants)}
              aria-label="Ver participantes"
              title="Participantes"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {participants.length > 0 && (
                <span className="badge">{participants.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        {(showParticipants || showChat) && (
          <aside className="meeting-sidebar">
            {/* Participants Tab */}
            {showParticipants && (
              <div className="sidebar-section participants-section">
                <h2 className="sidebar-title">
                  Participantes ({participants.length})
                </h2>
                <div className="participants-list">
                  {participants.map((participant) => (
                    <div key={participant.id} className="participant-item">
                      <div className="participant-avatar-small">
                        {(participant.user?.displayName ||
                          participant.user?.nickname ||
                          participant.user?.email ||
                          "U")[0].toUpperCase()}
                      </div>
                      <div className="participant-details">
                        <span className="participant-name-small">
                          {participant.user?.displayName ||
                            participant.user?.nickname ||
                            participant.user?.email}
                        </span>
                        {participant.userId === room?.creatorId && (
                          <span className="host-badge">Anfitrión</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {showChat && (
              <div className="sidebar-section chat-section">
                <h2 className="sidebar-title">Chat</h2>
                <div className="chat-messages">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-message ${
                        message.userId === user?.id ? "own-message" : ""
                      }`}
                    >
                      <div className="message-avatar">
                        {(message.user?.displayName ||
                          message.user?.nickname ||
                          message.user?.email ||
                          "U")[0].toUpperCase()}
                      </div>
                      <div className="message-content">
                        <div className="message-header">
                          <span className="message-author">
                            {message.user?.displayName ||
                              message.user?.nickname ||
                              message.user?.email}
                          </span>
                          <span className="message-time">
                            {message.createdAt
                              ? new Date(message.createdAt).toLocaleTimeString(
                                  "es-ES",
                                  { hour: "2-digit", minute: "2-digit" }
                                )
                              : ""}
                          </span>
                        </div>
                        <p className="message-text">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="chat-input-container">
                  <input
                    ref={chatInputRef}
                    type="text"
                    className="chat-input"
                    placeholder="Escribe un mensaje..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    aria-label="Mensaje de chat"
                  />
                  <button
                    className="chat-send-btn"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    aria-label="Enviar mensaje"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default Meeting;
