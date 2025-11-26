import { Navigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Protege rutas que requieren autenticación.
 * Si el usuario no está logueado, redirige a /login
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user) {
    // Redirigir a login si no está autenticado
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

