// src/services/message.service.ts
// Service for real-time chat message management

import api from "./api";

export interface Message {
  id: string;
  userId: string;
  roomId: string;
  content: string;
  visibility: "public" | "private" | "group";
  target?: any;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    email: string;
    nickname?: string;
    displayName?: string;
  };
}

export interface SendMessageData {
  userId: string;
  roomId: string;
  content: string;
  visibility?: "public" | "private" | "group";
  target?: any;
}

/**
 * Get messages for a specific room
 * Fetches message history with pagination support
 *
 * @param {string} roomId - Room ID to fetch messages for
 * @param {number} [limit=50] - Maximum number of messages to fetch
 * @param {number} [offset=0] - Offset for pagination
 * @returns {Promise<{data?: Message[], error?: string}>} Response with messages array or error
 */
export const getRoomMessages = async (
  roomId: string,
  limit: number = 50,
  offset: number = 0
) => {
  try {
    console.log(`[MESSAGE-SERVICE] Fetching messages for room ${roomId}`);
    const response = await api.get(
      `/message?roomId=${roomId}&limit=${limit}&offset=${offset}`
    );

    if (response.error) {
      console.log(
        `[MESSAGE-SERVICE] Error fetching messages: ${response.error}`
      );
      return { error: response.error };
    }

    console.log(
      `[MESSAGE-SERVICE] Fetched ${response.data?.length || 0} messages`
    );
    return { data: response.data as Message[] };
  } catch (error: any) {
    console.error("[MESSAGE-SERVICE] Error in getRoomMessages:", error);
    return { error: error.message || "Error al obtener mensajes" };
  }
};

/**
 * Send a message to a room
 * Creates a new message in the backend (Socket.io will broadcast it)
 *
 * @param {SendMessageData} messageData - Message data to send
 * @returns {Promise<{data?: Message, error?: string}>} Response with created message or error
 */
export const sendMessage = async (messageData: SendMessageData) => {
  try {
    console.log(
      `[MESSAGE-SERVICE] Sending message to room ${messageData.roomId}`
    );
    const response = await api.post("/message", {
      ...messageData,
      visibility: messageData.visibility || "public",
    });

    if (response.error) {
      console.log(`[MESSAGE-SERVICE] Error sending message: ${response.error}`);
      return { error: response.error };
    }

    console.log(`[MESSAGE-SERVICE] Message sent with ID: ${response.data?.id}`);
    return { data: response.data as Message };
  } catch (error: any) {
    console.error("[MESSAGE-SERVICE] Error in sendMessage:", error);
    return { error: error.message || "Error al enviar mensaje" };
  }
};

/**
 * Update a message (edit)
 * Updates message content
 *
 * @param {string} messageId - Message ID to update
 * @param {string} content - New message content
 * @returns {Promise<{data?: Message, error?: string}>} Response with updated message or error
 */
export const updateMessage = async (messageId: string, content: string) => {
  try {
    console.log(`[MESSAGE-SERVICE] Updating message ${messageId}`);
    const response = await api.patch(`/message/${messageId}`, {
      content,
      updatedAt: new Date().toISOString(),
    });

    if (response.error) {
      console.log(
        `[MESSAGE-SERVICE] Error updating message: ${response.error}`
      );
      return { error: response.error };
    }

    console.log("[MESSAGE-SERVICE] Message updated successfully");
    return { data: response.data as Message };
  } catch (error: any) {
    console.error("[MESSAGE-SERVICE] Error in updateMessage:", error);
    return { error: error.message || "Error al actualizar mensaje" };
  }
};

/**
 * Delete a message
 * Removes a message from the room
 *
 * @param {string} messageId - Message ID to delete
 * @returns {Promise<{data?: any, error?: string}>} Response with success or error
 */
export const deleteMessage = async (messageId: string) => {
  try {
    console.log(`[MESSAGE-SERVICE] Deleting message ${messageId}`);
    const response = await api.delete(`/message/${messageId}`);

    if (response.error) {
      console.log(
        `[MESSAGE-SERVICE] Error deleting message: ${response.error}`
      );
      return { error: response.error };
    }

    console.log("[MESSAGE-SERVICE] Message deleted successfully");
    return { data: response.data };
  } catch (error: any) {
    console.error("[MESSAGE-SERVICE] Error in deleteMessage:", error);
    return { error: error.message || "Error al eliminar mensaje" };
  }
};
