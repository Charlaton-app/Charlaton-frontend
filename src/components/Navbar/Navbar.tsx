import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import "./Navbar.scss";

interface NavbarProps {
  showAuthButtons?: boolean;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  showAuthButtons = true,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      navigate("/login");
    }
  };

  const handleProfileClick = () => {
    setIsUserMenuOpen(false);
    navigate("/profile");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Cerrar el menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Obtener la inicial del nombre del usuario
  const getUserInitial = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.nickname) {
      return user.nickname.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <header className="navbar" role="banner">
      <div className="navbar-container">
        <div className="logo">
          <h1 lang="es">CHARLATON</h1>
        </div>

        {/* Botón hamburguesa - visible en móvil */}
        <button
          className="hamburger-btn"
          onClick={toggleMenu}
          aria-label={
            isMenuOpen
              ? "Cerrar menú de navegación"
              : "Abrir menú de navegación"
          }
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          <span
            className={`hamburger-icon ${isMenuOpen ? "open" : ""}`}
            aria-hidden="true"
          >
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Navegación desktop - solo visible cuando NO hay usuario */}
        {!user && (
          <nav className="nav-links" aria-label="Navegación principal">
            <a href="/">Inicio</a>
            <a href="/about">Sobre nosotros</a>
          </nav>
        )}

        {/* Sección de autenticación */}
        {showAuthButtons && (
          <div
            id="mobile-menu"
            className={`auth-section ${isMenuOpen ? "mobile-open" : ""}`}
            aria-label="Sección de autenticación"
          >
            {/* Navegación - visible en mobile menu cuando NO hay usuario */}
            {!user && (
              <nav
                className="nav-links-mobile"
                aria-label="Navegación principal"
              >
                <a href="/" onClick={() => setIsMenuOpen(false)}>
                  Inicio
                </a>
                <a href="/about" onClick={() => setIsMenuOpen(false)}>
                  Sobre nosotros
                </a>
              </nav>
            )}
            {user ? (
              <>
                {/* User icon with dropdown */}
                <div className="user-menu-container" ref={userMenuRef}>
                  <button
                    className="user-icon-btn"
                    onClick={toggleUserMenu}
                    aria-label="Menú de usuario"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    aria-controls="user-dropdown-menu"
                  >
                    <div className="user-icon" aria-hidden="true">
                      {getUserInitial()}
                    </div>
                  </button>
                  {isUserMenuOpen && (
                    <div
                      id="user-dropdown-menu"
                      className="user-dropdown"
                      role="menu"
                      aria-label="Opciones de usuario"
                    >
                      <button
                        className="dropdown-item"
                        onClick={handleProfileClick}
                        role="menuitem"
                      >
                        Mi perfil
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={handleLogout}
                        role="menuitem"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  className="btn-outline"
                  onClick={() => navigate("/login")}
                  aria-label="Ir a iniciar sesión"
                >
                  INICIAR SESIÓN
                </button>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/signup")}
                  aria-label="Ir a crear cuenta nueva"
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
