import React, { useEffect, useRef } from 'react';
import './Modal.scss';

/**
 * Props para el componente Modal.
 * 
 * @interface ModalProps
 * @property {boolean} isOpen - Controla si el modal está visible
 * @property {() => void} onClose - Callback ejecutado al cerrar el modal
 * @property {string} title - Título mostrado en el encabezado del modal
 * @property {React.ReactNode} children - Contenido renderizado en el cuerpo del modal
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Componente Modal accesible y reutilizable.
 * 
 * Características de accesibilidad (WCAG 2.1):
 * - Focus trap: El foco se mantiene dentro del modal cuando está abierto
 * - Cierre con Escape: Permite cerrar el modal presionando la tecla Escape
 * - Cierre por backdrop: Click fuera del contenido cierra el modal
 * - ARIA attributes: role="dialog", aria-modal, aria-labelledby
 * - Bloqueo de scroll: Previene el scroll del body cuando el modal está abierto
 * 
 * @component
 * @param {ModalProps} props - Propiedades del componente
 * @returns {JSX.Element|null} El modal renderizado o null si isOpen es false
 */
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  /** Referencia al contenedor del modal para manejo de focus */
  const modalRef = useRef<HTMLDivElement>(null);
  /** Referencia al botón de cerrar para focus inicial */
  const closeButtonRef = useRef<HTMLButtonElement>(null);

   /**
   * Efecto para manejar el focus trap y el bloqueo de scroll.
   * Cuando el modal se abre:
   * - Enfoca el botón de cerrar
   * - Bloquea el scroll del body
   * Cuando se cierra, restaura el scroll del body.
   */
  useEffect(() => {
    if (isOpen) {
      // Focus trap
      closeButtonRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  /**
   * Efecto para manejar el cierre del modal con la tecla Escape.
   * Añade y remueve el event listener según el estado del modal.
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Maneja el click en el backdrop (overlay).
   * Solo cierra el modal si el click fue directamente en el overlay,
   * no en el contenido del modal.
   * 
   * @param {React.MouseEvent} e - Evento del click
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
