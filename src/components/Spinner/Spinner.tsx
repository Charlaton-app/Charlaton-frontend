/**
 * Spinner Loading Component
 * Displays a loading spinner with accessible ARIA labels
 * Implements WCAG 2.1 Level AA compliance
 */
import './Spinner.scss';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

/**
 * Spinner component for loading states
 * @param size - The size of the spinner (small, medium, large)
 * @param message - Optional loading message to display
 * @param fullScreen - Whether to display as full-screen overlay
 */
export default function Spinner({ 
  size = 'medium', 
  message = 'Cargando...', 
  fullScreen = false 
}: SpinnerProps) {
  const content = (
    <div className={`spinner spinner--${size}`} role="status" aria-live="polite">
      <div className="spinner__circle" aria-hidden="true"></div>
      <span className="spinner__message">{message}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="spinner-overlay">
        {content}
      </div>
    );
  }

  return content;
}
