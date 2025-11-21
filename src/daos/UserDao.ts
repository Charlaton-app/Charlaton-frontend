import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import type { CollectionReference, Timestamp } from "firebase/firestore";

import { db } from "../lib/firebase.config";

/**
 * Interfaz que representa un usuario en el sistema.
 * Define la estructura de datos almacenada en Firestore.
 *
 * @interface User
 * @property {string|null} [displayName] - Nombre visible del usuario
 * @property {string|null} [email] - Correo electrónico del usuario
 * @property {string|null} [photoURL] - URL de la foto de perfil
 * @property {Timestamp|null} [createdAt] - Marca de tiempo de creación
 * @property {Timestamp|null} [updatedAt] - Marca de tiempo de última actualización
 */
export interface User {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/**
 * Tipo para crear un nuevo usuario.
 * Excluye los campos autogenerados (id, createdAt, updatedAt).
 *
 * @typedef {Omit<User, "id" | "createdAt" | "updatedAt">} UserCreate
 */
export type UserCreate = Omit<User, "id" | "createdAt" | "updatedAt">;

/**
 * Tipo para actualizar un usuario existente.
 * Todos los campos son opcionales excepto id y createdAt.
 *
 * @typedef {Partial<Omit<User, "id" | "createdAt">>} UserUpdate
 */
export type UserUpdate = Partial<Omit<User, "id" | "createdAt">>;

/**
 * Data Access Object (DAO) para operaciones CRUD de usuarios en Firestore.
 * Implementa el patrón Singleton para garantizar una única instancia.
 *
 * @class UserDAO
 *
 * @example
 * // Obtener un usuario por ID
 * const result = await UserDAO.getUserById('user123');
 * if (result.success) {
 *   console.log(result.data);
 * }
 *
 * @example
 * // Crear un nuevo usuario
 * const result = await UserDAO.createUser({
 *   displayName: 'Juan Pérez',
 *   email: 'juan@example.com'
 * });
 */
class UserDAO {
  /**
   * Referencia a la colección de usuarios en Firestore.
   * @private
   * @type {CollectionReference}
   */
  private collectionRef: CollectionReference;

  /**
   * Constructor del DAO.
   * Inicializa la referencia a la colección "users" en Firestore.
   */
  constructor() {
    this.collectionRef = collection(db, "users");
  }

  /**
   * Obtiene un usuario por su ID de documento.
   *
   * @async
   * @param {string} id - ID del documento del usuario en Firestore
   * @returns {Promise<{success: true, data: User} | {success: false, data: null, error?: string}>}
   *          Objeto con success=true y datos del usuario, o success=false si no existe o hay error
   *
   * @example
   * const result = await UserDAO.getUserById('abc123');
   * if (result.success) {
   *   console.log('Usuario:', result.data.displayName);
   * } else {
   *   console.log('Usuario no encontrado');
   * }
   */

  async getUserById(
    id: string
  ): Promise<
    | { success: true; data: User }
    | { success: false; data: null; error?: string }
  > {
    try {
      const snap = await getDoc(doc(this.collectionRef, id));
      if (!snap.exists()) {
        return { success: false, data: null };
      }
      return { success: true, data: snap.data() };
    } catch (err: any) {
      console.error("Error getting document:", err);
      return { success: false, data: null, error: err?.message };
    }
  }

  /**
   * Crea un nuevo usuario en Firestore.
   * Automáticamente agrega timestamps de creación y actualización.
   *
   * @async
   * @param {UserCreate} userData - Datos del usuario a crear (sin id ni timestamps)
   * @returns {Promise<{success: true, id: string} | {success: false, error: string}>}
   *          Objeto con success=true y el ID generado, o success=false con mensaje de error
   *
   * @example
   * const result = await UserDAO.createUser({
   *   displayName: 'María García',
   *   email: 'maria@example.com',
   *   photoURL: 'https://example.com/photo.jpg'
   * });
   * if (result.success) {
   *   console.log('Usuario creado con ID:', result.id);
   * }
   */
  async createUser(
    userData: UserCreate
  ): Promise<
    { success: true; id: string } | { success: false; error: string }
  > {
    try {
      const docRef = await addDoc(this.collectionRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as User);
      console.log("Document written with ID:", docRef.id);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      console.error("Error adding document:", err);
      return { success: false, error: err?.message ?? "Unknown error" };
    }
  }

  /**
   * Actualiza un usuario existente en Firestore.
   * Automáticamente actualiza el timestamp de modificación.
   *
   * @async
   * @param {string} id - ID del documento del usuario a actualizar
   * @param {UserUpdate} userData - Campos a actualizar (parcial)
   * @returns {Promise<{success: true} | {success: false, error: string}>}
   *          Objeto con success=true si se actualizó correctamente, o success=false con error
   *
   * @example
   * const result = await UserDAO.updateUser('abc123', {
   *   displayName: 'Nuevo Nombre'
   * });
   * if (result.success) {
   *   console.log('Usuario actualizado');
   * }
   */
  async updateUser(
    id: string,
    userData: UserUpdate
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const userRef = doc(this.collectionRef, id);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      } as Partial<User>);
      console.log("Document successfully updated!");
      return { success: true };
    } catch (err: any) {
      console.error("Error updating document:", err);
      return { success: false, error: err?.message ?? "Unknown error" };
    }
  }

  /**
   * Elimina un usuario de Firestore.
   * Esta operación es permanente e irreversible.
   *
   * @async
   * @param {string} id - ID del documento del usuario a eliminar
   * @returns {Promise<{success: true} | {success: false, error: string}>}
   *          Objeto con success=true si se eliminó correctamente, o success=false con error
   *
   * @example
   * const result = await UserDAO.deleteUser('abc123');
   * if (result.success) {
   *   console.log('Usuario eliminado permanentemente');
   * }
   */
  async deleteUser(
    id: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      await deleteDoc(doc(this.collectionRef, id));
      console.log("Document successfully deleted!");
      return { success: true };
    } catch (err: any) {
      console.error("Error removing document:", err);
      return { success: false, error: err?.message ?? "Unknown error" };
    }
  }
}

export default new UserDAO();
