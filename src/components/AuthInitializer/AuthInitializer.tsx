import { useEffect } from "react";
import useAuthStore from "../../stores/useAuthStore";

/**
 * AuthInitializer Component
 * 
 * Inicializa el observer de autenticación de Firebase
 * cuando la aplicación carga por primera vez
 */
const AuthInitializer: React.FC = () => {
  const initAuthObserver = useAuthStore((state) => state.initAuthObserver);

  useEffect(() => {
    // Inicializar el observer de autenticación
    const unsubscribe = initAuthObserver();
    
    // Cleanup al desmontar
    return () => {
      unsubscribe();
    };
  }, [initAuthObserver]);

  return null; // Este componente no renderiza nada
};

export default AuthInitializer;

