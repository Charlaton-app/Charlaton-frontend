// src/pages/meeting/Meeting.tsx
// Meeting page with Google Meet-style UI, participants, and real-time chat

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import { useToastContext } from "../../contexts/ToastContext";
import { notificationSounds } from "../../utils/notificationSounds";
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
  type Message,
} from "../../services/message.service";
import { socket, connectToChat, disconnectFromChat } from "../../lib/socket.config";
import { getAccessToken } from "../../lib/getAccessToken";
import "./Meeting.scss";

const Meeting: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToastContext();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
  const [showParticipants, setShowParticipants] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  // Media state management
  const [micStates, setMicStates] = useState<Record<string, boolean>>({});
  const [cameraStates, setCameraStates] = useState<Record<string, boolean>>({});
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);

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
      if (!user?.id) {
        toast.error("Debes iniciar sesión para unirte a la reunión");
        navigate("/login");
        return;
      }

      if (!meetingId) {
        setError("ID de reunión no válido");
        setLoading(false);
        return;
      }

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

        // Load participants
        const participantsResponse = await getRoomParticipants(meetingId);
        if (!participantsResponse.error && participantsResponse.data) {
          let participantsList = participantsResponse.data;
          
          // Ensure current user is in participants list with proper user data
          const currentUserInList = participantsList.find(
            (p) => p.userId === user.id
          );
          
          if (!currentUserInList && user.id) {
            // Add current user to participants if not present
            participantsList = [
              ...participantsList,
              {
                id: `temp-${user.id}`,
                userId: user.id,
                roomId: meetingId,
                joinedAt: new Date().toISOString(),
                user: {
                  id: user.id,
                  email: user.email || "",
                  nickname: user.nickname || undefined,
                  displayName: user.displayName || undefined,
                },
              },
            ];
          } else if (currentUserInList && !currentUserInList.user && user.id) {
            // If user exists but doesn't have user data, add it
            currentUserInList.user = {
              id: user.id,
              email: user.email || "",
              nickname: user.nickname || undefined,
              displayName: user.displayName || undefined,
            };
          }
          
          // Filter out participants with null userId and enrich with user data where missing
          participantsList = participantsList
            .filter((p) => p.userId != null)
            .map((participant) => {
              // If participant doesn't have user data but has userId, try to use current user data if it matches
              if (!participant.user && participant.userId === user.id) {
                participant.user = {
                  id: user.id,
                  email: user.email || "",
                  nickname: user.nickname || undefined,
                  displayName: user.displayName || undefined,
                };
              }
              return participant;
            });
          
          setParticipants(participantsList);
          
          // Initialize mic and camera states for all participants
          const initialMicStates: Record<string, boolean> = {};
          const initialCameraStates: Record<string, boolean> = {};
          participantsList.forEach((participant) => {
            if (participant.userId) {
              const participantUserId = String(participant.userId);
              initialMicStates[participantUserId] = false;
              initialCameraStates[participantUserId] = false;
            }
          });
          setMicStates(initialMicStates);
          setCameraStates(initialCameraStates);
        }

        // Load messages
        const messagesResponse = await getRoomMessages(meetingId);
        if (!messagesResponse.error && messagesResponse.data) {
          // Sort messages by creation time to ensure correct order
          const sortedMessages = [...messagesResponse.data].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
          });
          setMessages(sortedMessages);
          // Scroll to bottom after messages load
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }

        notificationSounds.success();
        setLoading(false);
      } catch (err) {
        console.error("[MEETING] Error initializing meeting:", err);
        setError("Error al unirse a la reunión");
        setLoading(false);
      }
    };

    initializeMeeting();
  }, [meetingId, user?.id, navigate, toast]);

  /**
   * Setup Socket.io listeners and connect to chat server
   */
  useEffect(() => {
    if (!meetingId || !user?.id) return;

    const setupChatConnection = async () => {
      // Get access token for authentication
      const token = await getAccessToken();
      if (!token) {
        console.error("[MEETING] No access token available");
        setError("Error de autenticación. Por favor, recarga la página.");
        return;
      }

      // Connect to chat server with JWT authentication
      connectToChat(token);

      // Wait for connection before joining room
      socket.once("connect", () => {
        socket.emit("join_room", meetingId);
      });

      socket.on("connect_error", (error) => {
        console.error("[MEETING] Connection error:", error.message);
        setError("Error al conectar con el servidor de chat");
      });
    };

    setupChatConnection();

    // Listen for successful room join
    socket.on("join_room_success", () => {
      // Room joined successfully
    });

    socket.on("join_room_error", (response: any) => {
      console.error("[MEETING] Failed to join room:", response);
      setError(response.message || "No se pudo unir a la sala");
    });

    // Listen for online users in room
    socket.on("usersOnline", () => {
      // Users online updated
    });

    // Listen for new participants (from backend socket)
    socket.on("userJoined", (data: any) => {
      const newParticipant = data.participant;
      
      // Ensure participant has user data
      if (newParticipant && !newParticipant.user && newParticipant.userId) {
        // If it's the current user, add user data
        if (newParticipant.userId === user.id) {
          newParticipant.user = {
            id: user.id,
            email: user.email || "",
            nickname: user.nickname || undefined,
            displayName: user.displayName || undefined,
          };
        }
      }
      
      // Only add if userId is not null
      if (newParticipant && newParticipant.userId != null) {
        setParticipants((prev) => {
          // Check if participant already exists
          const exists = prev.some((p) => p.userId === newParticipant.userId);
          if (exists) return prev;
          return [...prev, newParticipant];
        });

        // Initialize states for new participant (ensure string userId)
        const participantUserId = String(newParticipant.userId);
        setMicStates((prev) => ({ ...prev, [participantUserId]: false }));
        setCameraStates((prev) => ({ ...prev, [participantUserId]: false }));

        notificationSounds.userJoined();
        const userName =
          newParticipant.user?.displayName ||
          newParticipant.user?.nickname ||
          newParticipant.user?.email ||
          "Usuario";
        toast.info(`${userName} se unió a la reunión`);
      }
    });

    // Listen for participants leaving
    socket.on("userLeft", (data: any) => {
      const leftUserId = String(data.userId);
      setParticipants((prev) =>
        prev.filter((p) => String(p.userId) !== leftUserId)
      );
      notificationSounds.userLeft();
      toast.info("Un usuario salió de la reunión");
    });

    // Listen for new messages (from chat microservice)
    socket.on("newMessage", (socketMessage: any) => {
      // Convert socket message format to our Message format
      const message: Message = {
        id: socketMessage.id || `temp-${Date.now()}`,
        userId: socketMessage.senderId || socketMessage.userId || "",
        roomId: socketMessage.roomId || meetingId || "",
        content: socketMessage.text || socketMessage.content || "",
        visibility: "public",
        createdAt: socketMessage.createAt || socketMessage.createdAt || new Date().toISOString(),
        createAt: socketMessage.createAt,
        user: socketMessage.user,
      };
      
      setMessages((prev) => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        
        // Add new message and sort by time
        const updated = [...prev, message].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        });
        return updated;
      });
      
      notificationSounds.newMessage();
      setTimeout(() => scrollToBottom(), 50);
    });

    // Listen for meeting end
    socket.on("meetingEnded", () => {
      toast.warning("La reunión ha sido finalizada por el anfitrión");
      navigate("/dashboard");
    });

    // Listen for mic state changes
    socket.on("micStateChanged", (data: { userId: string; isOn: boolean }) => {
      const userId = String(data.userId);
      setMicStates((prev) => ({ ...prev, [userId]: data.isOn }));
    });

    // Listen for camera state changes
    socket.on(
      "cameraStateChanged",
      (data: { userId: string; isOn: boolean }) => {
        const userId = String(data.userId);
        setCameraStates((prev) => ({ ...prev, [userId]: data.isOn }));
      }
    );

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("join_room_success");
      socket.off("join_room_error");
      socket.off("usersOnline");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("newMessage");
      socket.off("meetingEnded");
      socket.off("micStateChanged");
      socket.off("cameraStateChanged");
      
      // Leave room and disconnect
      if (socket.connected) {
        socket.emit("leaveRoom", { roomId: meetingId, userId: user.id });
        disconnectFromChat();
      }
    };
  }, [meetingId, user?.id, navigate, scrollToBottom, toast]);

  /**
   * Auto-scroll when new messages arrive
   */
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  /**
   * Reload messages and scroll when chat is opened
   */
  useEffect(() => {
    if (showChat && meetingId) {
      const reloadMessages = async () => {
        try {
          const messagesResponse = await getRoomMessages(meetingId);
          if (!messagesResponse.error && messagesResponse.data) {
            const sortedMessages = [...messagesResponse.data].sort((a, b) => {
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeA - timeB;
            });
            setMessages(sortedMessages);
            // Wait for DOM update then scroll
            setTimeout(() => {
              scrollToBottom();
            }, 150);
          }
        } catch (err) {
          console.error("[MEETING] Error reloading messages:", err);
        }
      };
      reloadMessages();
    }
  }, [showChat, meetingId, scrollToBottom]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !meetingId || !user?.id) return;

    try {
      // Send message via Socket.IO to chat server
      if (socket.connected) {
        socket.emit("sendMessage", {
          senderId: user.id,
          roomId: meetingId,
          text: content,
        });
        
        setMessageInput("");
        chatInputRef.current?.focus();
      } else {
        console.error("[MEETING] Socket not connected");
        setError("No estás conectado al chat. Recarga la página.");
      }
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

      notificationSounds.warning();
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

      notificationSounds.error();
      socket.disconnect();
      navigate("/dashboard");
    } catch (err) {
      console.error("[MEETING] Error ending meeting:", err);
    }
  };

  /**
   * Toggle microphone state
   */
  const toggleMic = () => {
    if (!user?.id || !meetingId) return;
    const userId = String(user.id);
    const newState = !isMicOn;
    setIsMicOn(newState);
    setMicStates((prev) => ({ ...prev, [userId]: newState }));
    socket.emit("toggleMic", { roomId: meetingId, userId, isOn: newState });
  };

  /**
   * Toggle camera state
   */
  const toggleCamera = () => {
    if (!user?.id || !meetingId) return;
    const userId = String(user.id);
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    setCameraStates((prev) => ({ ...prev, [userId]: newState }));
    socket.emit("toggleCamera", { roomId: meetingId, userId, isOn: newState });
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
          <h1 className="meeting-title">Reunión</h1>
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
            {participants
              .filter((p) => p.userId != null) // Filter out null userIds
              .map((participant) => {
              // Ensure userId is string for consistent comparison
              const participantUserId = String(participant.userId);
              const currentUserId = String(user?.id);
              const isCurrentUser = participantUserId === currentUserId;

              // Determine display name
              let displayName: string;
              if (isCurrentUser) {
                displayName =
                  user?.nickname ||
                  user?.displayName ||
                  user?.email?.split("@")[0] ||
                  "Usuario";
              } else {
                // Use participant.user data from backend
                const pUser = participant.user;
                displayName =
                  pUser?.nickname ||
                  pUser?.displayName ||
                  pUser?.email?.split("@")[0] ||
                  "Usuario";
              }

              const initial = displayName[0].toUpperCase();

              return (
                <div key={participant.id} className="video-tile">
                  <div className="participant-avatar">{initial}</div>
                  <div className="participant-info">
                    <span className="participant-name">
                      {displayName}
                      {participant.userId === room?.creatorId && " (Anfitrión)"}
                    </span>
                    <div className="media-controls">
                      <div
                        className={`media-icon ${
                          micStates[participantUserId] ? "active" : "inactive"
                        }`}
                        title="Micrófono"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="20"
                          height="20"
                        >
                          {micStates[participantUserId] ? (
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2" />
                          ) : (
                            <>
                              <line
                                x1="1"
                                y1="1"
                                x2="23"
                                y2="23"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            </>
                          )}
                        </svg>
                      </div>
                      <div
                        className={`media-icon ${
                          cameraStates[participantUserId]
                            ? "active"
                            : "inactive"
                        }`}
                        title="Cámara"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="20"
                          height="20"
                        >
                          {cameraStates[participantUserId] ? (
                            <>
                              <path d="M23 7l-7 5 7 5V7z" />
                              <rect x="1" y="5" width="15" height="14" rx="2" />
                            </>
                          ) : (
                            <>
                              <line
                                x1="1"
                                y1="1"
                                x2="23"
                                y2="23"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                              <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                            </>
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meeting Controls */}
          <div className="meeting-controls">
            <button
              className={`control-btn ${!isMicOn ? "muted" : ""}`}
              onClick={toggleMic}
              aria-label={isMicOn ? "Silenciar micrófono" : "Activar micrófono"}
              title={isMicOn ? "Silenciar" : "Activar micrófono"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isMicOn ? (
                  <>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </>
                ) : (
                  <>
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </>
                )}
              </svg>
            </button>{" "}
            <button
              className={`control-btn ${!isCameraOn ? "camera-off" : ""}`}
              onClick={toggleCamera}
              aria-label={isCameraOn ? "Desactivar cámara" : "Activar cámara"}
              title={isCameraOn ? "Desactivar cámara" : "Activar cámara"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isCameraOn ? (
                  <>
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </>
                ) : (
                  <>
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
                  </>
                )}
              </svg>
            </button>{" "}
            <button
              className={`control-btn ${showChat ? "active" : ""}`}
              onClick={() => {
                setShowChat(!showChat);
                if (!showChat) setShowParticipants(false);
              }}
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
              onClick={() => {
                setShowParticipants(!showParticipants);
                if (!showParticipants) setShowChat(false);
              }}
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
                <div className="sidebar-header">
                  <div></div>
                  <h2 className="sidebar-title">
                    Participantes ({participants.length})
                  </h2>
                  <button
                    className="sidebar-close-btn sidebar-title"
                    onClick={() => setShowParticipants(false)}
                    aria-label="Cerrar participantes"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="participants-list">
                  {participants
                    .filter((p) => p.userId != null) // Filter out null userIds
                    .map((participant) => {
                    const participantUserId = String(participant.userId);
                    const currentUserId = String(user?.id);
                    const isCurrentUser = participantUserId === currentUserId;

                    // Use same logic as video tiles for consistency
                    let displayName: string;
                    if (isCurrentUser) {
                      displayName =
                        user?.nickname ||
                        user?.displayName ||
                        user?.email?.split("@")[0] ||
                        "Usuario";
                    } else {
                      const pUser = participant.user;
                      displayName =
                        pUser?.nickname ||
                        pUser?.displayName ||
                        pUser?.email?.split("@")[0] ||
                        "Usuario";
                    }
                    const initial = displayName[0].toUpperCase();
                    return (
                      <div key={participant.id} className="participant-item">
                        <div className="participant-avatar-small">
                          {initial}
                        </div>
                        <div className="participant-details">
                          <span className="participant-name-small">
                            {displayName}
                          </span>
                          {participant.userId === room?.creatorId && (
                            <span className="host-badge">Anfitrión</span>
                          )}
                        </div>
                        <div className="participant-media-status">
                          <div
                            className={`status-icon ${
                              micStates[participantUserId] ? "active" : "muted"
                            }`}
                            title="Micrófono"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              width="18"
                              height="18"
                            >
                              {micStates[participantUserId] ? (
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              ) : (
                                <>
                                  <line
                                    x1="1"
                                    y1="1"
                                    x2="23"
                                    y2="23"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                </>
                              )}
                            </svg>
                          </div>
                          <div
                            className={`status-icon ${
                              cameraStates[participantUserId] ? "active" : "off"
                            }`}
                            title="Cámara"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              width="18"
                              height="18"
                            >
                              {cameraStates[participantUserId] ? (
                                <>
                                  <path d="M23 7l-7 5 7 5V7z" />
                                  <rect
                                    x="2"
                                    y="5"
                                    width="14"
                                    height="14"
                                    rx="2"
                                  />
                                </>
                              ) : (
                                <>
                                  <line
                                    x1="1"
                                    y1="1"
                                    x2="23"
                                    y2="23"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                  <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                                </>
                              )}
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {showChat && (
              <div className="sidebar-section chat-section">
                <div className="sidebar-header">
                  <h2 className="sidebar-title">Chat</h2>
                  <button
                    className="sidebar-close-btn"
                    onClick={() => setShowChat(false)}
                    aria-label="Cerrar chat"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="chat-empty-state">
                        {/* Large chat icon removed per UX request */}
                        <p>No hay mensajes aún</p>
                        <span>Comienza la conversación</span>
                      </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.userId === user?.id;
                      const displayName = isOwnMessage
                        ? user?.displayName ||
                          user?.nickname ||
                          user?.email ||
                          "Usuario"
                        : message.user?.displayName ||
                          message.user?.nickname ||
                          message.user?.email ||
                          "Usuario";
                      const initial = displayName[0].toUpperCase();

                      return (
                        <div
                          key={message.id}
                          className={`chat-message ${
                            isOwnMessage ? "own-message" : ""
                          }`}
                        >
                          <div className="message-bubble">
                            <div className="message-header">
                              <span className="message-author">
                                {displayName}
                              </span>
                              <span className="message-time">
                                {message.createdAt
                                  ? new Date(
                                      message.createdAt
                                    ).toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                            </div>
                            <p className="message-text">{message.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
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
