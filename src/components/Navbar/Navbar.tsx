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
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
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
              <div className="user-menu-container" ref={userMenuRef}>
                <button
                  className="user-icon-btn"
                  onClick={toggleUserMenu}
                  aria-label="Menú de usuario"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="user-icon">
                    {getUserInitial()}
                  </div>
                </button>
                {isUserMenuOpen && (
                  <div className="user-dropdown">
                    <button
                      className="dropdown-item"
                      onClick={handleProfileClick}
                    >
                      Mi perfil
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={handleLogout}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
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
