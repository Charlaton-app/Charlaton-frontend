/**
 * Toast Notification Component
 * Displays temporary notification messages to users
 * Implements WCAG 2.1 Level AA compliance with aria-live regions
 */
import { useEffect } from 'react';
import './Toast.scss';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

/**
 * Toast component with auto-dismiss functionality
 * @param message - The message to display
 * @param type - The toast type (success, error, info, warning)
 * @param duration - Time in milliseconds before auto-dismiss (default 3000)
 * @param onClose - Callback function when toast is closed
 */
export default function Toast({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getAriaLive = (): 'polite' | 'assertive' => {
    return type === 'error' ? 'assertive' : 'polite';
  };

  return (
    <div
      className={`toast toast--${type}`}
      role="alert"
      aria-live={getAriaLive()}
      aria-atomic="true"
    >
      <span className="toast__icon" aria-hidden="true">
        {getIcon()}
      </span>
      <p className="toast__message">{message}</p>
      <button
        className="toast__close"
        onClick={onClose}
        aria-label="Cerrar notificación"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}
