// src/services/room.service.ts
// Service for room/meeting management API calls

import api from "./api";

export interface Room {
  id: string;
  name: string;
  creatorId: string;
  password?: string | null;
  parentRoomId?: string | null;
  private?: boolean;
  scheduleAt?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  subRooms?: any[];
  connections?: any[];
}

export interface CreateRoomData {
  name: string;
  creatorId: string;
  password?: string | null;
  private?: boolean;
  scheduleAt?: string | null;
}

export interface Participant {
  id: string;
  userId: string;
  roomId: string;
  joinedAt: string;
  leftAt?: string | null;
  user?: {
    id: string;
    email: string;
    nickname?: string;
    displayName?: string;
  };
  isHost?: boolean;
}

/**
 * Get all available rooms
 * Fetches list of rooms that are not deleted
 *
 * @returns {Promise<{data?: Room[], error?: string}>} Response with rooms array or error
 */
export const getAllRooms = async () => {
  try {
    console.log("[ROOM-SERVICE] Fetching all rooms");
    const response = await api.get("/room");

    if (response.error) {
      console.log(`[ROOM-SERVICE] Error fetching rooms: ${response.error}`);
      return { error: response.error };
    }

    console.log(`[ROOM-SERVICE] Fetched ${response.data?.length || 0} rooms`);
    return { data: response.data as Room[] };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in getAllRooms:", error);
    return { error: error.message || "Error al obtener salas" };
  }
};

/**
 * Get room by ID
 * Fetches detailed information about a specific room including participants
 *
 * @param {string} roomId - Room ID to fetch
 * @returns {Promise<{data?: Room, error?: string}>} Response with room data or error
 */
export const getRoomById = async (roomId: string) => {
  try {
    console.log(`[ROOM-SERVICE] Fetching room ${roomId}`);
    const response = await api.get(`/room/${roomId}`);

    if (response.error) {
      console.log(`[ROOM-SERVICE] Error fetching room: ${response.error}`);
      return { error: response.error };
    }

    console.log(`[ROOM-SERVICE] Room ${roomId} fetched successfully`);
    return { data: response.data as Room };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in getRoomById:", error);
    return { error: error.message || "Error al obtener sala" };
  }
};

/**
 * Create a new room/meeting
 * Creates a new meeting room in the backend
 *
 * @param {CreateRoomData} roomData - Room creation data
 * @returns {Promise<{data?: Room, error?: string}>} Response with created room or error
 */
export const createRoom = async (roomData: CreateRoomData) => {
  try {
    console.log(`[ROOM-SERVICE] Creating room: ${roomData.name}`);
    const response = await api.post("/room", roomData);

    if (response.error) {
      console.log(`[ROOM-SERVICE] Error creating room: ${response.error}`);
      return { error: response.error };
    }

    console.log(`[ROOM-SERVICE] Room created with ID: ${response.data?.id}`);
    return { data: response.data as Room };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in createRoom:", error);
    return { error: error.message || "Error al crear sala" };
  }
};

/**
 * Join a room by ID
 * Validates room existence and creates user connection
 *
 * @param {string} roomId - Room ID to join
 * @param {string} userId - User ID joining the room
 * @param {string} [password] - Optional room password if required
 * @returns {Promise<{data?: any, error?: string}>} Response with connection data or error
 */
export const joinRoom = async (
  roomId: string,
  userId: string,
  password?: string
) => {
  try {
    console.log(`[ROOM-SERVICE] User ${userId} joining room ${roomId}`);

    // First check if room exists
    const roomResponse = await getRoomById(roomId);
    if (roomResponse.error) {
      return { error: "Sala no encontrada" };
    }

    const room = roomResponse.data;

    // Check password if room is private
    if (room?.password && room.password !== password) {
      console.log("[ROOM-SERVICE] Invalid room password");
      return { error: "Contraseña incorrecta" };
    }

    // Create user connection
    const response = await api.post("/userConnection", {
      userId,
      roomId,
    });

    if (response.error) {
      console.log(`[ROOM-SERVICE] Error joining room: ${response.error}`);
      return { error: response.error };
    }

    console.log(
      `[ROOM-SERVICE] User ${userId} joined room ${roomId} successfully`
    );
    return { data: response.data };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in joinRoom:", error);
    return { error: error.message || "Error al unirse a la sala" };
  }
};

/**
 * Leave a room
 * Updates user connection with leftAt timestamp
 *
 * @param {string} connectionId - Connection ID to close
 * @returns {Promise<{data?: any, error?: string}>} Response with success or error
 */
export const leaveRoom = async (connectionId: string) => {
  try {
    console.log(`[ROOM-SERVICE] Leaving room, connection ${connectionId}`);
    const response = await api.patch(`/userConnection/${connectionId}`, {
      leftAt: new Date().toISOString(),
    });

    if (response.error) {
      console.log(`[ROOM-SERVICE] Error leaving room: ${response.error}`);
      return { error: response.error };
    }

    console.log("[ROOM-SERVICE] Left room successfully");
    return { data: response.data };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in leaveRoom:", error);
    return { error: error.message || "Error al salir de la sala" };
  }
};

/**
 * Get participants in a room
 * Fetches all active connections for a room
 *
 * @param {string} roomId - Room ID to get participants for
 * @returns {Promise<{data?: Participant[], error?: string}>} Response with participants array or error
 */
export const getRoomParticipants = async (roomId: string) => {
  try {
    console.log(`[ROOM-SERVICE] Fetching participants for room ${roomId}`);
    const response = await api.get(`/userConnection?roomId=${roomId}`);

    if (response.error) {
      console.log(
        `[ROOM-SERVICE] Error fetching participants: ${response.error}`
      );
      return { error: response.error };
    }

    // Filter only active participants (no leftAt)
    const activeParticipants = (response.data as Participant[]).filter(
      (p) => !p.leftAt
    );

    console.log(
      `[ROOM-SERVICE] Found ${activeParticipants.length} active participants`
    );
    return { data: activeParticipants };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in getRoomParticipants:", error);
    return { error: error.message || "Error al obtener participantes" };
  }
};

/**
 * Delete/end a room (host only)
 * Soft deletes the room by setting deletedAt
 *
 * @param {string} roomId - Room ID to delete
 * @returns {Promise<{data?: any, error?: string}>} Response with success or error
 */
export const deleteRoom = async (roomId: string) => {
  try {
    console.log(`[ROOM-SERVICE] Deleting room ${roomId}`);
    const response = await api.delete(`/room/${roomId}`);

    if (response.error) {
      console.log(`[ROOM-SERVICE] Error deleting room: ${response.error}`);
      return { error: response.error };
    }

    console.log("[ROOM-SERVICE] Room deleted successfully");
    return { data: response.data };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in deleteRoom:", error);
    return { error: error.message || "Error al eliminar sala" };
  }
};
