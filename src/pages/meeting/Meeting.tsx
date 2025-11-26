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
  endRoom,
  getRoomParticipants,
  type Participant,
} from "../../services/room.service";
import {
  getRoomMessages,
  type Message,
} from "../../services/message.service";
import { connectToChat, disconnectFromChat, getSocket } from "../../lib/socket.config";
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
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
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
   * Helper to refresh participants from backend
   */
  const refreshParticipants = useCallback(async () => {
    if (!meetingId) return;
    const participantsResponse = await getRoomParticipants(meetingId);
    if (participantsResponse.error || !participantsResponse.data) {
      return;
    }

    setParticipants(participantsResponse.data);

    const participantIds = participantsResponse.data.map((p) =>
      String(p.userId)
    );

    setMicStates((prev) => {
      const updated = { ...prev };
      participantIds.forEach((id) => {
        if (!(id in updated)) {
          updated[id] = id === String(user?.id) ? isMicOn : false;
        }
      });
      Object.keys(updated).forEach((id) => {
        if (!participantIds.includes(id)) {
          delete updated[id];
        }
      });
      return updated;
    });

    setCameraStates((prev) => {
      const updated = { ...prev };
      participantIds.forEach((id) => {
        if (!(id in updated)) {
          updated[id] = id === String(user?.id) ? isCameraOn : false;
        }
      });
      Object.keys(updated).forEach((id) => {
        if (!participantIds.includes(id)) {
          delete updated[id];
        }
      });
      return updated;
    });
  }, [meetingId, user?.id, isMicOn, isCameraOn]);


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
        console.log("[MEETING] No authenticated user, redirecting to login");
        toast.error("Debes iniciar sesión para unirte a la reunión");
        navigate("/login");
        return;
      }

      if (!meetingId) {
        setError("ID de reunión no válido");
        setLoading(false);
        return;
      }

      console.log("[MEETING] User authenticated:", {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        nickname: user.nickname,
      });

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

        await refreshParticipants();

        // Load messages
        const messagesResponse = await getRoomMessages(meetingId);
        if (!messagesResponse.error && messagesResponse.data) {
          setMessages(messagesResponse.data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, user?.id]);

  /**
   * Setup Socket.io listeners
   */
  useEffect(() => {
    if (!meetingId || !user?.id) return;

    let socketInstance: any = null;
    let isCleanedUp = false;

    const setupSocket = async () => {
      console.log("[MEETING] Setting up Socket.io listeners");
      
      // Connect to chat server with authentication
      socketInstance = await connectToChat();
      if (!socketInstance) {
        console.error("[MEETING] Failed to connect to chat server");
        toast.error("Error al conectar con el servidor de chat");
        return;
      }

      // Remove any existing listeners first to prevent duplicates
      console.log("[MEETING] Removing any existing listeners before setup");
      socketInstance.off("join_room_success");
      socketInstance.off("join_room_error");
      socketInstance.off("usersOnline");
      socketInstance.off("newMessage");
      socketInstance.off("disconnect");
      socketInstance.off("userLeft");

      // Join room in socket (chat server format)
      console.log(`[MEETING] Joining room: ${meetingId}`);
      socketInstance.emit("join_room", meetingId);

      // Listen for join room success
      const handleJoinRoomSuccess = (response: any) => {
        if (isCleanedUp) return; // Ignore if component is unmounted
        
        console.log("[MEETING] ✅ Successfully joined room:", response);
        if (response.user && response.user.id !== user.id) {
          // Another user joined - only show notification once
          const userName =
            response.user.displayName ||
            response.user.nickname ||
            response.user.email ||
            "Usuario";
          
          console.log(`[MEETING] User ${userName} (${response.user.id}) joined, current user: ${user.id}`);
          toast.info(`${userName} se unió a la reunión`);
          notificationSounds.userJoined();
          refreshParticipants();
        }
      };
      
      socketInstance.on("join_room_success", handleJoinRoomSuccess);

      // Listen for join room error
      const handleJoinRoomError = (response: any) => {
        if (isCleanedUp) return; // Ignore if component is unmounted
        
        console.error("[MEETING] ❌ Error joining room:", response);
        toast.error(response.message || "Error al unirse a la sala");
      };
      
      socketInstance.on("join_room_error", handleJoinRoomError);

      // Listen for online users updates
      const handleUsersOnline = (users: any[]) => {
        if (isCleanedUp) return; // Ignore if component is unmounted
        console.log("[MEETING] 👥 Users online:", users.length);
        // Note: We don't show notifications here to avoid spam
        // The participants list is managed by the backend's getRoomParticipants
      };
      
      socketInstance.on("usersOnline", handleUsersOnline);

      // Listen for new messages (chat server format)
      const handleNewMessage = (message: any) => {
        if (isCleanedUp) return; // Ignore if component is unmounted
        
        console.log("[MEETING] New message received:", message);
        
        // Convert chat server message format to local Message format
        const localMessage: Message = {
          id: message.id || crypto.randomUUID(),
          userId: message.senderId,
          roomId: message.roomId,
          content: message.text,
          visibility: "public",
          user: message.user || {
            id: message.senderId,
            email: message.user?.email || "",
            displayName: message.user?.displayName,
            nickname: message.user?.nickname,
          },
          createdAt: message.createAt
            ? typeof message.createAt === "number"
              ? new Date(message.createAt).toISOString()
              : message.createAt.toDate
              ? message.createAt.toDate().toISOString()
              : new Date().toISOString()
            : new Date().toISOString(),
        };
        
        // Check if message already exists to avoid duplicates
        setMessages((prev) => {
          // Check if message with same ID already exists
          if (message.id && prev.some((msg) => msg.id === message.id)) {
            console.log("[MEETING] Message already exists (by ID), skipping duplicate");
            return prev;
          }
          
          // Check if message with same content, sender, and similar timestamp already exists
          const isDuplicate = prev.some(
            (msg) =>
              msg.userId === localMessage.userId &&
              msg.content === localMessage.content &&
              msg.createdAt &&
              localMessage.createdAt &&
              Math.abs(
                new Date(msg.createdAt).getTime() -
                  new Date(localMessage.createdAt).getTime()
              ) < 3000 // Within 3 seconds
          );
          
          if (isDuplicate) {
            console.log("[MEETING] Duplicate message detected (by content), skipping");
            return prev;
          }
          
          console.log("[MEETING] Adding new message to state");
          return [...prev, localMessage];
        });
        
        // Only play sound if it's not from current user
        if (message.senderId !== user.id) {
          notificationSounds.newMessage();
        }
        scrollToBottom();
      };
      
      socketInstance.on("newMessage", handleNewMessage);

      // Listen for disconnect events
      const handleDisconnect = (response: any) => {
        if (isCleanedUp) return; // Ignore if component is unmounted
        
        console.log("[MEETING] User disconnected:", response);
        if (response.user && response.user.id !== user.id) {
          const userName =
            response.user.displayName ||
            response.user.nickname ||
            response.user.email ||
            "Usuario";
          toast.info(`${userName} salió de la reunión`);
          notificationSounds.userLeft();
          
          // Remove the disconnected user from participants list
          setParticipants((prev) =>
            prev.filter((p) => String(p.userId) !== String(response.user.id))
          );
        }
      };
      
      socketInstance.on("disconnect", handleDisconnect);

      // Listen for when users leave the room
      const handleUserLeft = (data: any) => {
        if (isCleanedUp) return; // Ignore if component is unmounted
        
        console.log("[MEETING] User left room:", data);
        if (data.userId && data.userId !== user.id) {
          // Remove the user from participants list
          setParticipants((prev) =>
            prev.filter((p) => String(p.userId) !== String(data.userId))
          );
          notificationSounds.userLeft();
          toast.info("Un usuario salió de la reunión");
        }
      };
      
      socketInstance.on("userLeft", handleUserLeft);
    };

    setupSocket();

    return () => {
      console.log("[MEETING] Cleaning up Socket.io listeners");
      isCleanedUp = true;
      if (socketInstance) {
        // Remove all listeners to prevent duplicates
        console.log("[MEETING] Removing all socket listeners");
        socketInstance.off("join_room_success");
        socketInstance.off("join_room_error");
        socketInstance.off("usersOnline");
        socketInstance.off("newMessage");
        socketInstance.off("disconnect");
        socketInstance.off("userLeft");
        console.log("[MEETING] All listeners removed");
      }
      // Don't disconnect here - let it stay connected for the meeting
      // disconnectFromChat();
    };
  }, [meetingId, user?.id]);

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
      const socketInstance = getSocket();
      if (!socketInstance || !socketInstance.connected) {
        toast.error("No conectado al servidor de chat");
        return;
      }

      // Send message via Socket.IO (chat server format)
      socketInstance.emit("sendMessage", {
        senderId: user.id,
        roomId: meetingId,
        text: content,
      });

      // Don't add message locally - wait for server response via newMessage event
      // This prevents duplicate messages

      setMessageInput("");
      chatInputRef.current?.focus();
    } catch (err) {
      console.error("[MEETING] Error sending message:", err);
      toast.error("Error al enviar mensaje");
    }
  };

  /**
   * Handle leaving the meeting
   */
  const handleLeaveMeeting = async () => {
    if (!user?.id || !meetingId) return;

    try {
      await leaveRoom(user.id, meetingId);

      // Emit to socket (chat server format)
      const socketInstance = getSocket();
      if (socketInstance && socketInstance.connected) {
        socketInstance.emit("leaveRoom", {
          roomId: meetingId,
          userId: user.id,
        });
      }

      notificationSounds.warning();
      disconnectFromChat();
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

      // Disconnect from chat server
      const socketInstance = getSocket();
      if (socketInstance && socketInstance.connected) {
        socketInstance.emit("leaveRoom", {
          roomId: meetingId,
          userId: user?.id || "",
        });
      }

      notificationSounds.error();
      disconnectFromChat();
      navigate("/dashboard");
    } catch (err) {
      console.error("[MEETING] Error ending meeting:", err);
    }
  };

  /**
   * Handle finalizing the meeting (host/admin only)
   * Ends the meeting but keeps it in history (sets endedAt)
   */
  const handleFinalizeMeeting = async () => {
    if (!user?.id || !meetingId) return;

    try {
      console.log("[MEETING] Finalizing meeting");
      const response = await endRoom(meetingId, user.id);

      if (response.error) {
        toast?.error(response.error);
        return;
      }

      toast?.success("Reunión finalizada correctamente");
      notificationSounds.success();
      
      // Leave room and disconnect
      await leaveRoom(user.id, meetingId);
      const socketInstance = getSocket();
      if (socketInstance && socketInstance.connected) {
        socketInstance.emit("leaveRoom", {
          roomId: meetingId,
          userId: user.id,
        });
      }
      
      disconnectFromChat();
      navigate("/dashboard");
    } catch (err) {
      console.error("[MEETING] Error finalizing meeting:", err);
      toast?.error("Error al finalizar la reunión");
    }
  };

  /**
   * Toggle microphone state
   */
  const toggleMic = () => {
    if (!user?.id || !meetingId) return;
    const userId = String(user.id);
    const newState = !isMicOn;
    console.log("[MEETING] Toggle mic:", {
      userId,
      oldState: isMicOn,
      newState,
    });
    setIsMicOn(newState);
    setMicStates((prev) => {
      const updated = { ...prev, [userId]: newState };
      console.log("[MEETING] Updated micStates:", updated);
      return updated;
    });
    // Note: Mic/camera state changes are handled locally
    // If you need to sync with other participants, add custom events to chat server
    const socketInstance = getSocket();
    if (socketInstance && socketInstance.connected) {
      // You can emit custom events here if needed
      // socketInstance.emit("toggleMic", { roomId: meetingId, userId, isOn: newState });
    }
  };

  /**
   * Toggle camera state
   */
  const toggleCamera = () => {
    if (!user?.id || !meetingId) return;
    const userId = String(user.id);
    const newState = !isCameraOn;
    console.log("[MEETING] Toggle camera:", {
      userId,
      oldState: isCameraOn,
      newState,
    });
    setIsCameraOn(newState);
    setCameraStates((prev) => {
      const updated = { ...prev, [userId]: newState };
      console.log("[MEETING] Updated cameraStates:", updated);
      return updated;
    });
    // Note: Mic/camera state changes are handled locally
    // If you need to sync with other participants, add custom events to chat server
    const socketInstance = getSocket();
    if (socketInstance && socketInstance.connected) {
      // You can emit custom events here if needed
      // socketInstance.emit("toggleCamera", { roomId: meetingId, userId, isOn: newState });
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
        isOpen={showFinalizeModal}
        title="Finalizar y guardar reunión"
        message="¿Deseas finalizar esta reunión? La reunión se guardará en tu historial pero nadie podrá unirse nuevamente."
        confirmText="Finalizar reunión"
        cancelText="Cancelar"
        confirmButtonClass="btn-confirm"
        delaySeconds={0}
        onConfirm={handleFinalizeMeeting}
        onCancel={() => setShowFinalizeModal(false)}
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
              onClick={() => setShowFinalizeModal(true)}
              aria-label="Finalizar reunión"
              title="Finalizar reunión"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
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
            {participants.map((participant) => {
              // Ensure userId is string for consistent comparison
              const participantUserId = String(participant.userId);
              const currentUserId = String(user?.id);
              const isCurrentUser = participantUserId === currentUserId;

              // Determine display name with detailed logging
              let displayName: string;
              if (isCurrentUser) {
                displayName =
                  user?.nickname ||
                  user?.displayName ||
                  user?.email?.split("@")[0] ||
                  "Usuario";
                console.log(
                  `[MEETING] Current user name: "${displayName}" (from: ${
                    user?.nickname
                      ? "nickname"
                      : user?.displayName
                      ? "displayName"
                      : user?.email
                      ? "email"
                      : "fallback"
                  })`
                );
              } else {
                // Use participant.user data from backend
                const pUser = participant.user;
                displayName =
                  pUser?.nickname ||
                  pUser?.displayName ||
                  pUser?.email?.split("@")[0] ||
                  "Usuario";
                console.log(
                  `[MEETING] Participant ${participantUserId} name: "${displayName}"`
                );
                console.log(`  - participant.user:`, pUser);
                console.log(
                  `  - nickname: "${pUser?.nickname}", displayName: "${pUser?.displayName}", email: "${pUser?.email}"`
                );

                if (displayName === "Usuario") {
                  console.error(
                    `  ❌ PROBLEMA: No se encontró nombre para userId ${participantUserId}`
                  );
                  console.error(`  - participant.user existe?:`, !!pUser);
                  console.error(`  - Objeto completo:`, participant);
                }
              }

              const initial = displayName[0].toUpperCase();

              // Log mic/camera states
              console.log(
                `[MEETING] Video tile ${participantUserId}: mic=${micStates[participantUserId]}, camera=${cameraStates[participantUserId]}`
              );

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
                  {participants.map((participant) => {
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
                  {messages.map((message) => {
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
                        <div className="message-avatar">{initial}</div>
                        <div className="message-content">
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
                  })}
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
