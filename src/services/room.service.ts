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
  endedAt?: string | null;
  createdAt?: string;
  subRooms?: any[];
  connections?: any[];
  adminsId?: string[];
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
    const response = await api.get("/room");

    if (response.error) {
      return { error: response.error };
    }

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
    const response = await api.get(`/room/${roomId}`);

    if (response.error) {
      return { error: response.error };
    }

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
    const response = await api.post("/room", roomData);

    if (response.error) {
      return { error: response.error };
    }

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
    // First check if room exists
    const roomResponse = await getRoomById(roomId);
    if (roomResponse.error) {
      return { error: "Sala no encontrada" };
    }

    const room = roomResponse.data;

    // Check if room has ended
    if (room?.endedAt) {
      return { error: "Esta reunión ya ha finalizado" };
    }

    // Check password if room is private
    if (room?.password && room.password !== password) {
      return { error: "Contraseña incorrecta" };
    }

    // Create user connection
    const response = await api.post("/connection", {
      userId,
      roomId,
    });

    if (response.error) {
      return { error: response.error };
    }

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
export const leaveRoom = async (userId: string, roomId: string) => {
  try {
    const response = await api.put("/connection", {
      userId,
      roomId,
    });

    if (response.error) {
      return { error: response.error };
    }

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
    const response = await api.get(`/connection/room/${roomId}`);

    if (response.error) {
      return { error: response.error };
    }

    // Backend already filters only active participants (leftAt === null)
    const participants = (response.data as Participant[]) || [];
    
    // Additional safety check in case backend sends inactive ones
    const activeParticipants = participants.filter((p) => !p.leftAt);

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
    const response = await api.delete(`/room/${roomId}`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in deleteRoom:", error);
    return { error: error.message || "Error al eliminar sala" };
  }
};

/**
 * Get user's rooms (where they are creator or participant)
 * Returns paginated results
 *
 * @param {string} userId - User ID to get rooms for
 * @param {number} [page=1] - Page number
 * @param {number} [limit=3] - Items per page
 * @returns {Promise<{data?: any, error?: string}>} Response with paginated rooms or error
 */
export const getUserRooms = async (userId: string, page: number = 1, limit: number = 3) => {
  try {
    const response = await api.get(`/room/user/${userId}?page=${page}&limit=${limit}`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in getUserRooms:", error);
    return { error: error.message || "Error al obtener reuniones del usuario" };
  }
};

/**
 * Get user statistics
 * Returns total meetings this month, total duration, and active contacts
 *
 * @param {string} userId - User ID to get stats for
 * @returns {Promise<{data?: any, error?: string}>} Response with stats or error
 */
export const getUserStats = async (userId: string) => {
  try {
    const response = await api.get(`/room/user/${userId}/stats`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in getUserStats:", error);
    return { error: error.message || "Error al obtener estadísticas" };
  }
};

/**
 * End a room/meeting (creator or admin only)
 * Sets endedAt timestamp and prevents new joins
 *
 * @param {string} roomId - Room ID to end
 * @param {string} userId - User ID attempting to end the room
 * @returns {Promise<{data?: any, error?: string}>} Response with success or error
 */
export const endRoom = async (roomId: string, userId: string) => {
  try {
    const response = await api.post(`/room/${roomId}/end`, { userId });

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  } catch (error: any) {
    console.error("[ROOM-SERVICE] Error in endRoom:", error);
    return { error: error.message || "Error al finalizar reunión" };
  }
};
