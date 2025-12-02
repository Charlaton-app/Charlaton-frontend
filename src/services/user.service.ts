// src/services/user.service.ts
// Service for user-related API calls

import api from "./api";

export interface BasicUser {
  id: string;
  email: string;
  nickname?: string;
  displayName?: string;
}

export const getUserById = async (userId: string) => {
  try {
    const res = await api.get<BasicUser>(`/user/${userId}`);
    if (res.error) return { error: res.error };
    return { data: res.data as BasicUser };
  } catch (err: any) {
    console.error("[USER-SERVICE] Error in getUserById:", err);
    return { error: err.message || "Error al obtener usuario" };
  }
};
