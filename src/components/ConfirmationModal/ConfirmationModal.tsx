import React, { useState, useEffect } from 'react';
import './ConfirmationModal.scss';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  delaySeconds?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation Modal Component
 * Displays a modal dialog with optional delay before confirm button becomes enabled
 * 
 * @param {ConfirmationModalProps} props - Modal configuration
 * @returns {JSX.Element | null} Modal component or null if not open
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmButtonClass = 'btn-confirm',
  delaySeconds = 0,
  onConfirm,
  onCancel,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(delaySeconds);
  const [canConfirm, setCanConfirm] = useState(delaySeconds === 0);

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(delaySeconds);
      setCanConfirm(delaySeconds === 0);
      return;
    }

    if (delaySeconds === 0) {
      setCanConfirm(true);
      return;
    }

    setTimeRemaining(delaySeconds);
    setCanConfirm(false);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCanConfirm(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, delaySeconds]);

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && canConfirm) {
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="confirmation-modal-overlay" 
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-message"
    >
      <div 
        className="confirmation-modal-content" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="confirmation-modal-header">
          <h2 id="confirmation-modal-title" className="confirmation-modal-title">
            {title}
          </h2>
          <button
            className="confirmation-modal-close"
            onClick={handleCancel}
            aria-label="Cerrar modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="confirmation-modal-body">
          <p id="confirmation-modal-message" className="confirmation-modal-message">
            {message}
          </p>
        </div>

        <div className="confirmation-modal-footer">
          <button
            className="btn-cancel"
            onClick={handleCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`${confirmButtonClass} ${!canConfirm ? 'disabled' : ''}`}
            onClick={handleConfirm}
            disabled={!canConfirm}
            type="button"
            aria-live="polite"
            aria-atomic="true"
          >
            {!canConfirm 
              ? `${confirmText} (${timeRemaining}s)` 
              : confirmText
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
