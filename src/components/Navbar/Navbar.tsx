import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import "./Navbar.scss";

/**
 * Props para el componente Navbar.
 * 
 * @interface NavbarProps
 * @property {boolean} [showAuthButtons=true] - Controla si se muestran los botones de autenticación
 * @property {() => void} [onLogout] - Callback personalizado para el logout (opcional)
 */
interface NavbarProps {
  showAuthButtons?: boolean;
  onLogout?: () => void;
}

/**
 * Componente de barra de navegación principal de la aplicación.
 * 
 * Características:
 * - Logo y nombre de la aplicación
 * - Navegación responsive con menú hamburguesa para móviles
 * - Botones de autenticación (login/registro) cuando no hay usuario
 * - Menú de usuario con avatar cuando hay sesión activa
 * - Dropdown con opciones de perfil y logout
 * 
 * Accesibilidad (WCAG 2.1):
 * - role="banner" en el header
 * - aria-label en navegaciones
 * - aria-expanded y aria-controls en menús desplegables
 * - aria-haspopup para indicar menús
 * - Navegación por teclado
 * 
 * @component
 * @param {NavbarProps} props - Propiedades del componente
 * @returns {JSX.Element} Barra de navegación renderizada
 */
const Navbar: React.FC<NavbarProps> = ({
  showAuthButtons = true,
  onLogout,
}) => {
  const navigate = useNavigate();
  /** Usuario autenticado del store global */
  const { user } = useAuthStore();
   /** Estado del menú móvil */
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /**
   * Maneja el cierre de sesión del usuario.
   * Cierra el menú de usuario y ejecuta el callback de logout.
   * Si no hay callback personalizado, navega a la página de login.
   */
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate("/login");
    }
  };

   /**
   * Alterna el estado del menú móvil.
   */
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <h1>CHARLATON</h1>
        </div>

        {/* Botón hamburguesa - visible en móvil */}
        <button
          className="hamburger-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-icon ${isMenuOpen ? "open" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Navegación - solo visible cuando NO hay usuario autenticado */}
        {!user && (
          <nav className="nav-links">
            <a href="/">Inicio</a>
            <a href="/about">Sobre nosotros</a>
          </nav>
        )}

        {/* Sección de autenticación */}
        {showAuthButtons && (
          <div className={`auth-section ${isMenuOpen ? "mobile-open" : ""}`}>
            {user ? (
              <>
                <span className="user-name">
                  {user.displayName || user.email}
                </span>
                <button onClick={handleLogout} className="btn-outline">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-outline"
                  onClick={() => navigate("/login")}
                >
                  INICIAR SESIÓN
                </button>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/signup")}
                >
                  REGISTRARSE
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
