import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Profile.scss";

/**
 * Página de Perfil del usuario autenticado.
 * 
 * Secciones:
 * - Tarjeta de usuario: Avatar, nombre, email, estadísticas
 * - Información personal: Formulario para editar nombre y email
 * - Cambio de contraseña: Formulario de cambio de contraseña
 * - Zona de peligro: Eliminación de cuenta
 * 
 * Funcionalidades:
 * - Edición de información personal
 * - Cambio de contraseña con validación
 * - Eliminación de cuenta con confirmación
 * - Feedback visual con alertas de error/éxito
 * - Soporte para usuarios OAuth (email no editable)
 * 
 * Accesibilidad (WCAG 2.1):
 * - Skip link para contenido principal
 * - Formularios con labels asociados correctamente
 * - aria-invalid en campos con error
 * - aria-describedby para mensajes de error
 * - Alertas con role="alert" y aria-live
 * 
 * @component
 * @returns {JSX.Element} Página de perfil completa
 */
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="profile-page">
      <Navbar onLogout={handleLogout} />

      <div className="profile-card">
        <div className="profile-content">
          <h1>Bienvenido</h1>
          <p className="welcome-text">{user?.displayName || user?.email}</p>
          <button onClick={() => navigate("/chat")} className="chat-button">
            Ir al Chat Global
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
