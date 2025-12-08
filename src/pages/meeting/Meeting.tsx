// src/pages/meeting/Meeting.tsx
// Meeting page with Google Meet-style UI, participants, and real-time chat

/**
 * Meeting page component
 *
 * Responsibilities:
 * - Join/leave Charlaton rooms using the REST `room.service` layer.
 * - Synchronize participant list and media states (mic/camera) in real time.
 * - Integrate with the chat microservice for in‑room messaging.
 * - Expose host‑only actions such as ending or deleting a meeting.
 *
 * The implementation is intentionally state‑heavy to keep all meeting‑related
 * behavior encapsulated in a single page component.
 */
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
  type Room,
} from "../../services/room.service";
import { getRoomMessages, type Message } from "../../services/message.service";
import { getUserById, type BasicUser } from "../../services/user.service";
import {
  connectToChat,
  disconnectFromChat,
  getSocket,
} from "../../lib/socket.config";
import { connectToWebRTC } from "../../lib/webrtcSocket.config";
import { auth } from "../../lib/firebase.config";
import { webrtcManager } from "../../lib/webrtc.config";
import type { Socket } from "socket.io-client";
import "./Meeting.scss";

// Socket event response interfaces
interface JoinRoomResponse {
  success: boolean;
  message?: string;
  roomId?: string;
}

interface UserData {
  id: string;
  userId: string;
  email: string;
  nickname?: string;
  displayName?: string;
  user?: {
    id: string;
    email: string;
    nickname?: string;
    displayName?: string;
  };
}

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
  const [room, setRoom] = useState<Room | null>(null);
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

  // WebRTC refs for media elements
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  // Cache for fetched users to avoid refetching repeatedly
  const userCacheRef = useRef<Map<string, BasicUser>>(new Map());
  // Mapping between Firebase UIDs and emails (from WebRTC user_joined events)
  const firebaseUidToEmailRef = useRef<Map<string, string>>(new Map());
  // Keep participants in ref for event handlers
  const participantsRef = useRef<Participant[]>([]);

  // WebRTC state
  const [isWebRTCInitialized, setIsWebRTCInitialized] = useState(false);
  const webrtcJoinedRef = useRef(false);
  const setupCompleteRef = useRef(false); // Track if setup is complete to avoid double cleanup

  /**
   * Helper to refresh participants from backend
   */
  const refreshParticipants = useCallback(async () => {
    if (!meetingId) return;
    
    console.log("[MEETING] 🔄 Refreshing participants from backend...");
    const participantsResponse = await getRoomParticipants(meetingId);
    
    if (participantsResponse.error || !participantsResponse.data) {
      console.error("[MEETING] ❌ Error fetching participants:", participantsResponse.error);
      return;
    }

    console.log(`[MEETING] 📥 Received ${participantsResponse.data.length} participants from backend`);
    
    // 🚨 CRITICAL: Show ALL participants to identify duplicates
    console.log(`[MEETING] 🔍 ALL PARTICIPANTS BEFORE FILTERING:`);
    participantsResponse.data.forEach((p, idx) => {
      console.log(`  [${idx}] userId: ${p.userId}, firebaseUid: ${p.firebaseUid || 'MISSING'}, hasUser: ${!!p.user}, email: ${p.user?.email || 'N/A'}`);
    });
    
    // Prefer connections that have resolved user information (backend-created)
    // to avoid duplicates coming from auxiliary services that only store userId.
    const fetched = participantsResponse.data.filter((p) => p.user);
    console.log(`[MEETING] 📋 ${fetched.length} participants have user info (${participantsResponse.data.length - fetched.length} without user data - WILL BE SKIPPED)`);
    
    // De-duplicate by userId, prefer entries with user info
    const byUserId = new Map<string, Participant>();
    for (const p of fetched) {
      const key = String(p.userId);
      const existing = byUserId.get(key);
      if (!existing) {
        byUserId.set(key, p);
      } else {
        const preferred = existing.user ? existing : p.user ? p : existing;
        byUserId.set(key, preferred);
      }
    }
    
    const uniqueParticipants = Array.from(byUserId.values());
    console.log(`[MEETING] 👥 Setting ${uniqueParticipants.length} unique participants`);
    setParticipants(uniqueParticipants);

    // Enrich participants missing `user` with a lightweight fetch
    // This runs in background and updates state once resolved
    (async () => {
      try {
        const updates: Record<string, BasicUser> = {};
        await Promise.all(
          fetched
            .filter((p) => !p.user && p.userId)
            .map(async (p) => {
              const uid = String(p.userId);
              if (userCacheRef.current.has(uid)) {
                updates[p.id] = userCacheRef.current.get(uid)!;
                return;
              }
              const res = await getUserById(uid);
              if (res.data) {
                userCacheRef.current.set(uid, res.data);
                updates[p.id] = res.data;
              }
            })
        );

        if (Object.keys(updates).length > 0) {
          setParticipants((prev) =>
            prev.map((p) => (updates[p.id] ? { ...p, user: updates[p.id] } : p))
          );
        }
      } catch {
        // Silent fail; console noise avoided
      }
    })();

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

  // Keep participantsRef in sync with participants state
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

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
   * Setup Socket.io listeners and WebRTC
   * Connects to TWO separate servers:
   * 1. Chat server (port 3000/5000) - for messages and room management
   * 2. WebRTC server (port 5050) - for audio/video signaling
   */
  useEffect(() => {
    if (!meetingId || !user?.id) return;

    let chatSocket: Socket | null = null;
    let webrtcSocket: Socket | null = null;
    let isCleanedUp = false;

    const setupSockets = async () => {
      console.log("[MEETING] Setting up Socket connections");
      console.log(`[MEETING] Room ID: ${meetingId}, User ID: ${user.id}`);

      // ===== 1. Connect to CHAT server =====
      console.log("[MEETING] Connecting to CHAT server...");
      chatSocket = await connectToChat();
      if (!chatSocket) {
        console.error("[MEETING] ❌ Failed to connect to chat server");
        toast.error("Error al conectar con el servidor de chat");
        return;
      }
      console.log("[MEETING] ✅ Connected to CHAT server");

      // ===== 2. Connect to WEBRTC server =====
      console.log("[MEETING] Connecting to WEBRTC server...");
      webrtcSocket = await connectToWebRTC();
      if (!webrtcSocket) {
        console.error("[MEETING] ❌ Failed to connect to WebRTC server");
        toast.error("Error al conectar con el servidor WebRTC");
        return;
      }
      console.log("[MEETING] ✅ Connected to WEBRTC server");

      // ===== 3. Register remote stream callback BEFORE any connections =====
      console.log("[MEETING] 🎥 Registering remote stream callback");
      webrtcManager.setOnRemoteStreamCallback(handleRemoteStream);

      // Remove any existing listeners first to prevent duplicates
      console.log("[MEETING] Removing any existing listeners before setup");
      chatSocket.off("join_room_success");
      chatSocket.off("join_room_error");
      chatSocket.off("user_joined");
      chatSocket.off("usersOnline");
      chatSocket.off("new_success");
      chatSocket.off("disconnect");
      chatSocket.off("userLeft");
      chatSocket.off("room_users");
      chatSocket.off("message_success");

      // ===== DEFINE ALL LISTENERS FIRST (before emitting) =====
      
      // Listen for CHAT join room success
      const handleChatJoinSuccess = async (response: JoinRoomResponse) => {
        if (isCleanedUp) return;
        console.log("[MEETING] ✅ Successfully joined CHAT room:", response);
      };

      chatSocket.on("join_room_success", handleChatJoinSuccess);

      // Listen for CHAT join room error
      const handleChatJoinError = (response: JoinRoomResponse) => {
        if (isCleanedUp) return;
        console.error("[MEETING] ❌ Error joining CHAT room:", response);
        toast.error(response.message || "Error al unirse al chat");
      };

      chatSocket.on("join_room_error", handleChatJoinError);

      // Listen for WEBRTC join room success
      const handleWebRTCJoinSuccess = async (response: JoinRoomResponse) => {
        if (isCleanedUp) {
          console.log("[MEETING] ⚠️ isCleanedUp=true, ignoring join_room_success");
          return;
        }

        console.log("[MEETING] ✅ Successfully joined WEBRTC room:", response);
        console.log(
          "[MEETING] WEBRTC response:",
          JSON.stringify(response, null, 2)
        );

        // Get Firebase UID for WebRTC (servers use Firebase UID, not backend ID)
        const firebaseUid = auth.currentUser?.uid;
        if (!firebaseUid) {
          console.error("[MEETING] ❌ No Firebase UID available");
          return;
        }

        // Initialize WebRTC after successfully joining the WebRTC room
        console.log("[MEETING] 🔍 Checking WebRTC init conditions:", {
          isWebRTCInitialized,
          hasWebrtcSocket: !!webrtcSocket,
          hasMeetingId: !!meetingId,
          hasFirebaseUid: !!firebaseUid,
          firebaseUid
        });
        
        if (!isWebRTCInitialized && webrtcSocket && meetingId && firebaseUid) {
          console.log("[MEETING] Initializing WebRTC manager...");
          try {
            await webrtcManager.initialize(
              meetingId,
              firebaseUid,
              webrtcSocket
            );

            // Start local media with audio + video permissions requested,
            // but keep mic and camera tracks disabled by default to match UI state
            console.log("[MEETING] Starting local media...");
            let localStream: MediaStream | null = null;
            
            try {
              // Request both audio+video permissions, but start tracks disabled (false, false)
              localStream = await webrtcManager.startLocalMedia(
                false, // audio track starts disabled
                false  // video track starts disabled
              );
            } catch (error: any) {
              // If video fails, try audio only
              if (error.name === 'NotReadableError') {
                console.warn("[MEETING] ⚠️ Video unavailable, continuing with audio only");
                toast.warning("Cámara no disponible, solo audio");
                try {
                  localStream = await webrtcManager.startLocalMedia(
                    false,  // audio track starts disabled
                    false   // video track starts disabled
                  );
                } catch (audioError) {
                  console.error("[MEETING] ❌ Failed to get even audio:", audioError);
                  throw audioError;
                }
              } else {
                throw error;
              }
            }

            if (localStream && localAudioRef.current) {
              localAudioRef.current.srcObject = localStream;
              console.log(
                "[MEETING] ✅ Local audio stream attached to element"
              );
            }
            if (localStream && localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
              console.log(
                "[MEETING] ✅ Local video stream attached to element"
              );
            }

            setIsWebRTCInitialized(true);
            // Tracks already start disabled, so just set UI state to match
            setIsMicOn(false);
            setIsCameraOn(false);
            
            console.log(
              "[MEETING] ✅ WebRTC initialized successfully (mic/camera muted by default)"
            );
          } catch (error) {
            console.error("[MEETING] ❌ Error initializing WebRTC:", error);
            toast.error("Error al inicializar audio/video");
          }
        }
      };

      console.log("[MEETING] 🎧 Registering join_room_success listener for WebRTC");
      webrtcSocket.on("join_room_success", handleWebRTCJoinSuccess);

      // Listen for WEBRTC join room error
      const handleWebRTCJoinError = (response: JoinRoomResponse) => {
        if (isCleanedUp) return;
        console.error("[MEETING] ❌ Error joining WEBRTC room:", response);
        toast.error(response.message || "Error al unirse a WebRTC");
      };

      console.log("[MEETING] 🎧 Registering join_room_error listener for WebRTC");
      webrtcSocket.on("join_room_error", handleWebRTCJoinError);

      // Listen for users online in WEBRTC
      const handleUsersOnline = async (users: UserData[]) => {
        if (isCleanedUp) return;
        console.log("[MEETING] 👥 Users online in WebRTC:", users.length, "users");
        console.log("[MEETING] 📋 User details:", users.map(u => ({
          id: u.id,
          userId: u.userId,
          email: u.email,
          displayName: u.displayName
        })));

        // Filter out current user
        const otherUsers = users.filter((u) => {
          const userId = u.userId || u.id;
          return userId && userId !== String(user.id);
        });

        console.log(`[MEETING] Found ${otherUsers.length} other users to connect to`);

        // Keep participants list in sync without reload
        await refreshParticipants();

        // Establish WebRTC connections to all existing users
        if (isWebRTCInitialized && otherUsers.length > 0) {
          console.log(
            `[MEETING] 🔗 Establishing WebRTC connections to ${otherUsers.length} existing user(s)`
          );
          
          for (const u of otherUsers) {
            const userId = u.userId || u.id;
            if (userId) {
              console.log(`[MEETING] 📤 Creating peer connection to ${userId}`);
              try {
                await webrtcManager.sendOffer(userId, handleRemoteStream);
                console.log(`[MEETING] ✅ Peer connection established with ${userId}`);
              } catch (error) {
                console.error(
                  `[MEETING] ❌ Error creating connection to ${userId}:`,
                  error
                );
              }
            }
          }
          console.log("[MEETING] ✅ All peer connections established");
        } else if (!isWebRTCInitialized) {
          console.warn("[MEETING] ⚠️ WebRTC not initialized yet, skipping peer connections");
        } else {
          console.log("[MEETING] ℹ️ No other users to connect to");
        }
      };

      webrtcSocket.on("usersOnline", handleUsersOnline);

      // Listen for user joined via WebRTC
      const handleUserJoinedWebRTC = async (userData: UserData) => {
        if (isCleanedUp) return;
        console.log("[MEETING] 👤 User joined WebRTC:", userData);
        console.log("[MEETING] 📋 User data details:", {
          id: userData.id,
          userId: userData.userId,
          email: userData.email,
          displayName: userData.displayName,
          nickname: userData.nickname,
          user: userData.user
        });

        // Store Firebase UID → email mapping for stream attachment
        const firebaseUid = userData.userId || userData.id;
        if (firebaseUid && userData.email) {
          firebaseUidToEmailRef.current.set(firebaseUid, userData.email);
          console.log(`[MEETING] 📝 Mapped Firebase UID ${firebaseUid} → ${userData.email}`);
        }

        const targetUserId = userData.userId || userData.id;
        
        if (targetUserId && targetUserId !== String(user.id)) {
          const userName =
            userData.displayName ||
            userData.nickname ||
            userData.email ||
            "Usuario";

          console.log(`[MEETING] ✅ New participant: ${userName} (${targetUserId})`);
          toast.info(`${userName} se unió a la reunión`);
          notificationSounds.userJoined();

          // OPTIMISTIC UPDATE: Add user immediately to participants list
          console.log("[MEETING] 🚀 Optimistic UI update - adding participant");
          setParticipants((prev) => {
            // Check if user is already in the list
            const exists = prev.some((p) => String(p.userId) === String(targetUserId));
            if (exists) {
              console.log("[MEETING] ⚠️ Participant already in list, skipping optimistic update");
              return prev;
            }

            // Create a temporary participant entry
            const newParticipant: Participant = {
              id: `temp-${targetUserId}`,
              userId: targetUserId,
              roomId: meetingId!,
              role: "participant" as const,
              joinedAt: new Date().toISOString(),
              user: userData.user || {
                id: targetUserId,
                email: userData.email || "",
                displayName: userData.displayName,
                nickname: userData.nickname,
              },
            };

            console.log("[MEETING] ✅ Added participant optimistically:", newParticipant);
            return [...prev, newParticipant];
          });

          // Initialize media states for new participant
          setMicStates((prev) => ({ ...prev, [targetUserId]: false }));
          setCameraStates((prev) => ({ ...prev, [targetUserId]: false }));

          // Reconcile with backend after a short delay (gives backend time to update)
          setTimeout(async () => {
            console.log("[MEETING] 🔄 Reconciling participants with backend");
            await refreshParticipants();
          }, 500);

          // If WebRTC is initialized, send offer to new user
          if (isWebRTCInitialized) {
            console.log(
              `[MEETING] 📤 Sending WebRTC offer to new user ${targetUserId}`
            );
            try {
              await webrtcManager.sendOffer(targetUserId, handleRemoteStream);
              console.log(`[MEETING] ✅ Offer sent successfully to ${targetUserId}`);
            } catch (error) {
              console.error(`[MEETING] ❌ Error sending offer to ${targetUserId}:`, error);
            }
          } else {
            console.warn("[MEETING] ⚠️ WebRTC not initialized, cannot send offer");
          }
        } else {
          console.log("[MEETING] ℹ️ Ignoring self-join event or invalid userId");
        }
      };

      webrtcSocket.on("user_joined", handleUserJoinedWebRTC);

      // Listen for user left
      const handleUserLeft = (userData: UserData) => {
        if (isCleanedUp) return;
        console.log("[MEETING] 👋 User left:", userData);

        if (userData && userData.id) {
          const userName =
            userData.displayName ||
            userData.nickname ||
            userData.email ||
            "Usuario";
          toast.info(`${userName} salió de la reunión`);
          notificationSounds.userLeft();
          // Optimistic UI update: remove from participants immediately
          setParticipants((prev) =>
            prev.filter((p) => String(p.userId) !== String(userData.id))
          );
          setMicStates((prev) => {
            const updated = { ...prev };
            delete updated[String(userData.id)];
            return updated;
          });
          setCameraStates((prev) => {
            const updated = { ...prev };
            delete updated[String(userData.id)];
            return updated;
          });
          // Stop any remote audio/video for this user
          const audioEl = remoteAudiosRef.current.get(String(userData.id));
          if (audioEl) {
            audioEl.srcObject = null;
            remoteAudiosRef.current.delete(String(userData.id));
          }
          const remoteStream = remoteStreamsRef.current.get(
            String(userData.id)
          );
          if (remoteStream) {
            remoteStream.getTracks().forEach((t) => t.stop());
            remoteStreamsRef.current.delete(String(userData.id));
          }
          // Then reconcile with backend state
          refreshParticipants();
        }
      };

      webrtcSocket.on("user_left", handleUserLeft);
      chatSocket.on("userLeft", handleUserLeft);

      // Listen for media state changes from other users
      const handleMediaStateChange = ({
        userId,
        micEnabled,
        cameraEnabled,
      }: {
        userId: string;
        micEnabled: boolean;
        cameraEnabled: boolean;
      }) => {
        if (isCleanedUp) return;
        console.log(
          `[MEETING] 📡 Media state changed for Firebase UID ${userId}: mic=${micEnabled}, camera=${cameraEnabled}`
        );

        // Map Firebase UID to Backend ID using ref (always has latest participants)
        const participant = participantsRef.current.find((p) => p.firebaseUid === userId);
        const backendUserId = participant?.userId || userId;
        
        console.log(`[MEETING] 🔗 Mapped Firebase UID ${userId} → Backend ID ${backendUserId}`);

        setMicStates((prev) => ({ ...prev, [backendUserId]: micEnabled }));
        setCameraStates((prev) => ({ ...prev, [backendUserId]: cameraEnabled }));
      };

      chatSocket.on("user_media_changed", handleMediaStateChange);

      // Listen for messages from CHAT server
      const handleNewMessage = (messageData: unknown) => {
        if (isCleanedUp) return;
        console.log("[MEETING] 📨 New message received:", messageData);
        // Normalize payloads from different chat servers
        const payload = (messageData as Record<string, unknown>) || {};
        const normalized: Message = {
          id: (payload.id as string) || `srv-${Date.now()}`,
          userId: (payload.userId as string) || "",
          roomId: meetingId,
          content: (payload.content as string) || (payload.msg as string) || "",
          visibility: (payload.visibility as Message["visibility"]) || "public",
          createdAt: (payload.createdAt as string) || new Date().toISOString(),
          user:
            typeof payload.user === "object" && payload.user !== null
              ? (payload.user as Message["user"])
              : undefined,
        };
        // If message is from current user and user field missing, populate it
        if (
          normalized.userId === String(user?.id) &&
          !normalized.user &&
          user
        ) {
          normalized.user = {
            id: String(user.id),
            email: user.email || "",
            displayName: user.displayName || undefined,
            nickname: user.nickname || undefined,
          };
        } else if (!normalized.user && normalized.userId) {
          // Fallback: try to resolve user data from cache/participants
          const cachedUser = userCacheRef.current.get(
            String(normalized.userId)
          );
          if (cachedUser) {
            normalized.user = {
              id: String(cachedUser.id),
              email: cachedUser.email || "",
              nickname: cachedUser.nickname,
              displayName:
                cachedUser.displayName ||
                cachedUser.nickname ||
                cachedUser.email?.split("@")[0] ||
                undefined,
            };
          }
        }
        console.log("[MEETING] 📨 Normalized message:", {
          id: normalized.id,
          userId: normalized.userId,
          user: normalized.user,
          content: normalized.content.substring(0, 50),
        });
        setMessages((prev) => {
          if (prev.some((m) => m.id === normalized.id)) return prev;
          return [...prev, normalized];
        });
        scrollToBottom();
        notificationSounds.newMessage();
      };

      // Standalone chat microservice events
      chatSocket.on("new_success", handleNewMessage);
      chatSocket.on("message_success", handleNewMessage);

      // Handle disconnection
      const handleDisconnect = (reason: string) => {
        if (isCleanedUp) return;
        console.log("[MEETING] ⚠️ Disconnected:", reason);
        if (reason === "io server disconnect") {
          toast.warning("Desconectado del servidor");
        }
      };

      chatSocket.on("disconnect", handleDisconnect);
      webrtcSocket.on("disconnect", handleDisconnect);

      // Listen for room ended (host finalization)
      const handleRoomEnded = (payload: {
        success: boolean;
        roomId: string;
        message?: string;
      }) => {
        if (isCleanedUp) return;
        console.log("[MEETING] 🔚 Room ended:", payload);
        toast.error(payload.message || "La reunión ha finalizado");
        notificationSounds.error();
        // Cleanup and navigate
        disconnectFromChat();
        webrtcManager.cleanup();
        navigate("/dashboard");
      };

      chatSocket.on("room_ended", handleRoomEnded);
      webrtcSocket.on("room_ended", handleRoomEnded);

      // ===== NOW EMIT JOIN EVENTS (after all listeners are ready) =====
      
      console.log(`[MEETING] 📤 Emitting join_room to CHAT server: ${meetingId}`);
      chatSocket.emit("join_room", meetingId);

      // Join room in WEBRTC socket (guard against double emission)
      if (!webrtcJoinedRef.current) {
        console.log(`[MEETING] 📤 Emitting join_room to WEBRTC server: ${meetingId}`);
        webrtcSocket.emit("join_room", { roomId: meetingId, success: true });
        webrtcJoinedRef.current = true;
      } else {
        console.log(
          `[MEETING] ⚠️ WebRTC join_room already emitted, skipping duplicate`
        );
      }
      
      // Mark setup as complete
      setupCompleteRef.current = true;
      console.log("[MEETING] ✅ Socket setup complete");
    };

    setupSockets();

    // Cleanup function
    return () => {
      console.log("[MEETING] Cleanup called, setupCompleteRef:", setupCompleteRef.current);
      
      // Only cleanup if setup was actually complete
      // This prevents React StrictMode from removing listeners prematurely
      if (!setupCompleteRef.current) {
        console.log("[MEETING] ⏭️ Skipping cleanup - setup not complete (StrictMode double render)");
        return;
      }
      
      console.log("[MEETING] Cleaning up sockets and WebRTC");
      isCleanedUp = true;
      webrtcJoinedRef.current = false;
      setupCompleteRef.current = false;

      // Remove all listeners from chat socket
      if (chatSocket) {
        chatSocket.off("join_room_success");
        chatSocket.off("join_room_error");
        chatSocket.off("user_joined");
        chatSocket.off("usersOnline");
        chatSocket.off("new_success");
        chatSocket.off("message_success");
        chatSocket.off("disconnect");
        chatSocket.off("userLeft");
        chatSocket.off("room_users");
        chatSocket.off("user_media_changed");
        chatSocket.off("room_ended");
      }

      // Remove all listeners from WebRTC socket
      if (webrtcSocket) {
        webrtcSocket.off("join_room_success");
        webrtcSocket.off("join_room_error");
        webrtcSocket.off("user_joined");
        webrtcSocket.off("user_left");
        webrtcSocket.off("usersOnline");
        webrtcSocket.off("disconnect");
        webrtcSocket.off("room_ended");
      }

      // Cleanup WebRTC
      if (isWebRTCInitialized) {
        webrtcManager.cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, user?.id]);

  /**
   * Handle remote stream from WebRTC connection
   *
   * @param stream - The remote media stream
   * @param firebaseUid - The Firebase UID of the remote user
   */
  const handleRemoteStream = useCallback(
    (stream: MediaStream, firebaseUid: string) => {
      console.log(`[MEETING] 📥 Received remote stream from Firebase UID ${firebaseUid}`);
      console.log(`[MEETING] Stream ID: ${stream.id}`);
      console.log(`[MEETING] Stream has ${stream.getTracks().length} tracks:`);
      
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      console.log(`[MEETING]   🎤 Audio tracks: ${audioTracks.length}`);
      audioTracks.forEach((track, idx) => {
        console.log(`[MEETING]     [${idx}] id=${track.id}, enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}`);
      });
      
      console.log(`[MEETING]   📹 Video tracks: ${videoTracks.length}`);
      videoTracks.forEach((track, idx) => {
        console.log(`[MEETING]     [${idx}] id=${track.id}, enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}`);
        console.log(`[MEETING]     [${idx}] settings:`, track.getSettings());
      });

      // Store stream using Firebase UID as key
      remoteStreamsRef.current.set(firebaseUid, stream);
      
      // Map Firebase UID to Backend ID for state updates
      const participant = participantsRef.current.find((p) => p.firebaseUid === firebaseUid);
      const backendUserId = participant?.userId || firebaseUid;
      
      // Update camera state based on video tracks presence
      const hasVideo = videoTracks.length > 0 && videoTracks.some(t => t.enabled && t.readyState === 'live');
      if (hasVideo && backendUserId) {
        console.log(`[MEETING] 📹 Stream has active video - updating cameraState for ${backendUserId} to true`);
        setCameraStates((prev) => ({ ...prev, [backendUserId]: true }));
      }

      // Create audio element for this user if it doesn't exist
      if (!remoteAudiosRef.current.has(firebaseUid)) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = stream;
        remoteAudiosRef.current.set(firebaseUid, audio);
        console.log(`[MEETING] ✅ Audio element created for Firebase UID ${firebaseUid}`);
      } else {
        // Update existing audio element
        const existingAudio = remoteAudiosRef.current.get(firebaseUid);
        if (existingAudio) {
          existingAudio.srcObject = stream;
          console.log(`[MEETING] ✅ Updated audio element for Firebase UID ${firebaseUid}`);
        }
      }

      // Try to attach to video element
      // First, try using Firebase UID directly (in case participant uses Firebase UID)
      let videoEl = document.getElementById(`video-${firebaseUid}`) as HTMLVideoElement | null;
      
      if (!videoEl) {
        // If not found, try to find the backend ID by matching Firebase UID in chat server data
        // (This is a workaround for the mismatch between Firebase UIDs and Backend IDs)
        console.log(`[MEETING] 🔍 Video element not found with Firebase UID, checking participants map...`);
        
        // We'll attach when the useEffect runs and can access participants state
        console.log(
          `[MEETING] ⚠️ Video element not yet rendered for Firebase UID ${firebaseUid}, will attach when rendered`
        );
      } else {
        videoEl.srcObject = stream;
        console.log(`[MEETING] 🎥 Remote video attached for Firebase UID ${firebaseUid}`);
      }
    },
    []
  );

  // Note: Remote stream callback is now registered inline in setupSockets (line ~334)
  // to ensure it's set BEFORE any peer connections are created.

  /**
   * Auto-scroll when new messages arrive
   */
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  /**
   * Attach remote streams to video elements when they are rendered
   */
  useEffect(() => {
    console.log(`[MEETING] 🔄 useEffect triggered - attempting to attach remote streams`);
    console.log(`[MEETING]   - Remote streams count: ${remoteStreamsRef.current.size}`);
    console.log(`[MEETING]   - Camera states:`, cameraStates);
    console.log(`[MEETING]   - Participants count: ${participants.length}`);
    
    // For each remote stream, try to attach to video element
    remoteStreamsRef.current.forEach((stream, firebaseUid) => {
      console.log(`[MEETING] 🔍 Processing stream for Firebase UID: ${firebaseUid}`);
      console.log(`[MEETING]   - Stream ID: ${stream.id}`);
      console.log(`[MEETING]   - Stream active: ${stream.active}`);
      console.log(`[MEETING]   - Video tracks in stream: ${stream.getVideoTracks().length}`);
      
      stream.getVideoTracks().forEach((track, idx) => {
        console.log(`[MEETING]     📹 Video track [${idx}]: enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}`);
      });
      
      // Find participant with matching firebaseUid to get backend userId
      let backendUserId = firebaseUid; // Default to Firebase UID
      
      const matchingParticipant = participants.find(p => 
        p.firebaseUid === firebaseUid
      );
      
      if (matchingParticipant) {
        backendUserId = String(matchingParticipant.userId);
        console.log(`[MEETING] 🔗 Mapped Firebase UID ${firebaseUid} → Backend ID ${backendUserId}`);
      } else {
        console.log(`[MEETING] ⚠️ No participant found with Firebase UID ${firebaseUid}, trying email match...`);
        
        // Fallback: try email match
        const email = firebaseUidToEmailRef.current.get(firebaseUid);
        if (email) {
          const emailMatch = participants.find(p => 
            p.user?.email?.toLowerCase() === email.toLowerCase()
          );
          if (emailMatch) {
            backendUserId = String(emailMatch.userId);
            console.log(`[MEETING] 🔗 Mapped Firebase UID ${firebaseUid} → Backend ID ${backendUserId} via email ${email}`);
          }
        }
      }
      
      // Try to find video element using backend userId
      const videoEl = document.getElementById(
        `video-${backendUserId}`
      ) as HTMLVideoElement | null;
      
      console.log(`[MEETING]   - Checking video element for Firebase UID ${firebaseUid} (backend ID: ${backendUserId}):`);
      console.log(`[MEETING]     - Element found: ${!!videoEl}`);
      console.log(`[MEETING]     - Current srcObject: ${videoEl?.srcObject}`);
      console.log(`[MEETING]     - Stream to attach: ${stream}`);
      console.log(`[MEETING]     - Stream tracks: ${stream.getTracks().length}`);
      
      // Check if stream has active video and update camera state if needed
      const hasActiveVideo = stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');
      if (hasActiveVideo && cameraStates[backendUserId] !== true) {
        console.log(`[MEETING] 📹 Stream has video but cameraState is false - updating to true for ${backendUserId}`);
        setCameraStates((prev) => ({ ...prev, [backendUserId]: true }));
      }
      
      if (videoEl) {
        console.log(`[MEETING]     - Video element details:`);
        console.log(`[MEETING]       - paused: ${videoEl.paused}`);
        console.log(`[MEETING]       - muted: ${videoEl.muted}`);
        console.log(`[MEETING]       - autoplay: ${videoEl.autoplay}`);
        console.log(`[MEETING]       - playsInline: ${videoEl.playsInline}`);
      }
      
      if (videoEl && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        
        // Force play - try multiple times as browsers may block autoplay
        const tryPlay = async () => {
          try {
            await videoEl.play();
            console.log(`[MEETING] ✅ Video playing for ${backendUserId}`);
          } catch (err: any) {
            console.error(`[MEETING] ❌ Error playing video for ${backendUserId}:`, err.message);
            
            // If blocked due to autoplay policy, try again when user interacts
            if (err.name === 'NotAllowedError') {
              console.log(`[MEETING] 🔄 Autoplay blocked, will retry on user interaction`);
              const retryPlay = () => {
                videoEl.play().catch(e => console.error('[MEETING] Retry play failed:', e));
                document.removeEventListener('click', retryPlay);
              };
              document.addEventListener('click', retryPlay, { once: true });
            }
          }
        };
        
        tryPlay();
        
        // Also retry when element becomes visible (when camera is turned on)
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && videoEl.paused) {
              console.log(`[MEETING] 📺 Video element became visible, retrying play for ${backendUserId}`);
              videoEl.play().catch(e => console.error('[MEETING] Play on visible failed:', e));
            }
          });
        });
        observer.observe(videoEl);
        
        console.log(
          `[MEETING] 🎥 Attached remote stream to video element for ${backendUserId} (Firebase UID: ${firebaseUid})`
        );
        console.log(`[MEETING]     - Video tracks attached: ${stream.getVideoTracks().length}`);
        console.log(`[MEETING]     - Audio tracks attached: ${stream.getAudioTracks().length}`);
      } else if (!videoEl) {
        console.log(`[MEETING] ❌ Video element not found for backend ID ${backendUserId} (Firebase UID: ${firebaseUid})`);
        console.log(`[MEETING]     - Looking for element with ID: video-${backendUserId}`);
      } else {
        console.log(`[MEETING] ⏭️ Stream already attached for ${backendUserId}`);
      }
    });
  }, [cameraStates, participants]); // Re-run when camera states or participants change

  /**
   * Attach local video stream when camera is turned on
   */
  useEffect(() => {
    if (isCameraOn && localVideoRef.current) {
      const localStream = webrtcManager.getLocalStream();
      if (localStream && localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
        console.log("[MEETING] 🎥 Local video stream attached to video element");
      }
    }
  }, [isCameraOn, cameraStates]); // Re-run when camera state changes

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !meetingId || !user?.id) return;

    try {
      const socketInstance = getSocket();
      if (!socketInstance || !socketInstance.connected) {
        console.error("[MEETING] ❌ Chat socket not connected");
        toast.error("No conectado al servidor de chat");
        return;
      }

      console.log("[MEETING] 📤 Sending message:", {
        msg: content,
        userId: user.id,
        roomId: meetingId,
      });

      // Send message via Socket.IO (standalone chat microservice echoes back to sender)
      socketInstance.emit("message", {
        msg: content,
        visibility: "public",
        target: null,
      });

      // Clear input
      setMessageInput("");
      chatInputRef.current?.focus();

      console.log("[MEETING] ✅ Message sent successfully");
    } catch (err) {
      console.error("[MEETING] ❌ Error sending message:", err);
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
        // Also broadcast room end so all users exit immediately
        socketInstance.emit("end_room");
      }

      // Notify WebRTC server too
      try {
        const webrtcSocket = await connectToWebRTC();
        if (webrtcSocket && webrtcSocket.connected) {
          webrtcSocket.emit("end_room");
        }
      } catch (e) {
        console.warn("[MEETING] Could not notify WebRTC server end_room", e);
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

    // Broadcast media state change to other participants
    const socketInstance = getSocket();
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit("media_state_changed", {
        micEnabled: newState,
        cameraEnabled: isCameraOn,
      });
      console.log("[MEETING] 📡 Broadcasted mic state change:", newState);
    }

    // Update WebRTC audio track
    if (isWebRTCInitialized) {
      if (newState && !webrtcManager.getLocalStream()) {
        // Need to start media if not already started
        webrtcManager
          .startLocalMedia(
            newState, // audio track enabled state = newState
            isCameraOn  // video track enabled state = isCameraOn
          )
          .then((stream) => {
            if (stream && localAudioRef.current) {
              localAudioRef.current.srcObject = stream;
            }
          })
          .catch((error) => {
            console.error("[MEETING] ❌ Error starting media:", error);
            toast.error("Error al activar el micrófono");
            setIsMicOn(false);
          });
      } else {
        webrtcManager.toggleAudio(newState);
      }
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

    // Broadcast media state change to other participants
    const socketInstance = getSocket();
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit("media_state_changed", {
        micEnabled: isMicOn,
        cameraEnabled: newState,
      });
      console.log("[MEETING] 📡 Broadcasted camera state change:", newState);
    }

    // Update WebRTC video track
    if (isWebRTCInitialized) {
      if (newState) {
        // When turning camera on, need to acquire video stream
        console.log("[MEETING] Requesting video stream...");
        webrtcManager
          .startLocalMedia(
            isMicOn,  // audio track enabled state = isMicOn
            true      // video track enabled state = true (we're turning camera on)
          )
          .then((stream) => {
            if (stream) {
              // Stream is already updated in WebRTCManager.startLocalMedia
              // No need to call updateLocalStream again here

              if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
              }
              
              // Use setTimeout to ensure the video element is rendered
              setTimeout(() => {
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = stream;
                  console.log(
                    "[MEETING] ✅ Video stream attached to local video element"
                  );
                } else {
                  console.warn("[MEETING] ⚠️ localVideoRef.current is null after camera enabled");
                }
              }, 100);
              
              console.log("[MEETING] ✅ Camera enabled, stream attached");
            }
          })
          .catch((error) => {
            console.error("[MEETING] ❌ Error starting camera:", error);
            toast.error("Error al activar la cámara");
            setIsCameraOn(false);
            setCameraStates((prev) => ({ ...prev, [userId]: false }));
          });
      } else {
        // When turning camera off, just disable the track
        console.log("[MEETING] Disabling video track...");
        webrtcManager.toggleVideo(false);
      }
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
            {(() => {
              // Combine participants from backend with users that have remote streams
              const participantMap = new Map<string, Participant>();
              
              // Add all backend participants
              participants.forEach(p => {
                participantMap.set(String(p.userId), p);
              });
              
              // Add participants with remote streams that aren't in participants array
              remoteStreamsRef.current.forEach((stream, firebaseUid) => {
                // Try to find matching participant by Firebase UID
                const matchingParticipant = participants.find(p => p.firebaseUid === firebaseUid);
                
                if (!matchingParticipant) {
                  // Skip participants without backend info - they'll appear once backend syncs
                  console.log(`[MEETING] ⏭️ Skipping participant with Firebase UID ${firebaseUid} - waiting for backend sync`);
                }
              });
              
              return Array.from(participantMap.values());
            })().map((participant) => {
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
                if (displayName === "Usuario" && import.meta.env.DEV) {
                  console.debug(
                    `[MEETING] Nombre no resuelto para userId ${participantUserId} (mostrando "Usuario")`
                  );
                }
              }

              const initial = displayName[0].toUpperCase();

              return (
                <div key={participant.id} className="video-tile">
                  <video
                    id={`video-${participantUserId}`}
                    ref={isCurrentUser ? localVideoRef : undefined}
                    autoPlay
                    playsInline
                    muted={isCurrentUser}
                    className="participant-video"
                    style={{ display: cameraStates[participantUserId] ? 'block' : 'none' }}
                  />
                  {!cameraStates[participantUserId] && (
                    <div className="participant-avatar">{initial}</div>
                  )}
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
                  <div className="sidebar-title-with-status">
                    <span
                      className={`chat-status-dot ${
                        getSocket() && getSocket()!.connected
                          ? "online"
                          : "offline"
                      }`}
                      aria-hidden="true"
                    />
                    <h2 className="sidebar-title">Chat</h2>
                  </div>
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

                    // Try to resolve a friendly name for the author
                    let displayName: string | undefined;

                    if (isOwnMessage) {
                      // 1) Current user from auth store
                      displayName =
                        user?.displayName ||
                        user?.nickname ||
                        user?.email?.split("@")[0];

                      // 2) Fallback to participant info if available
                      if (!displayName && participants.length > 0) {
                        const selfParticipant = participants.find(
                          (p) => String(p.userId) === String(user?.id)
                        );
                        const pUser = selfParticipant?.user;
                        displayName =
                          pUser?.nickname ||
                          pUser?.displayName ||
                          pUser?.email?.split("@")[0];
                      }
                    } else {
                      // Message from other user
                      const participant = participants.find(
                        (p) => String(p.userId) === String(message.userId)
                      );
                      const pUser = participant?.user;

                      displayName =
                        message.user?.nickname ||
                        message.user?.displayName ||
                        message.user?.email?.split("@")[0] ||
                        pUser?.nickname ||
                        pUser?.displayName ||
                        pUser?.email?.split("@")[0];
                    }

                    // Final fallback
                    displayName = displayName || "Usuario";
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

      {/* Hidden audio element for local stream (muted to prevent echo) */}
      <audio ref={localAudioRef} muted autoPlay style={{ display: "none" }} />
    </div>
  );
};

export default Meeting;
