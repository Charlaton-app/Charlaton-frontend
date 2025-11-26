import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuthStore from "../../stores/useAuthStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Protege rutas que requieren autenticación.
 * Si el usuario no está logueado, redirige a /login
 * Espera a que el store se inicialice antes de redirigir
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isInitialized } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Esperar a que el store se inicialice
    if (isInitialized) {
      setIsChecking(false);
    }
  }, [isInitialized]);

  // Mostrar loading mientras se verifica la autenticación
  if (isChecking || !isInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }

  // Si no hay usuario después de inicializar, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

