/**
 * ToastContainer Component
 * Container for rendering multiple toast notifications
 */
import Toast from './Toast';
import type { ToastType } from './Toast';

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: number) => void;
}

/**
 * ToastContainer component to display multiple toasts
 * @param toasts - Array of toast notifications
 * @param onClose - Callback to remove a toast
 */
export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
}
