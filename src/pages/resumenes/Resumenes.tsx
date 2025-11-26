/**
 * Resumenes Page Component
 *
 * Página de resúmenes de reuniones - próximamente
 *
 * @author MARATON Team
 * @version 1.0.0
 */

import React from "react";
import "./Resumenes.scss";

const Resumenes: React.FC = () => {
  return (
    <div className="resumenes-page">
      <div className="resumenes-container">
        <div className="resumenes-header">
          <h1>Resúmenes de Reuniones</h1>
          <p className="subtitle">
            Accede a los resúmenes y transcripciones de tus reuniones
          </p>
        </div>

        <div className="resumenes-content">
          <div className="placeholder-content">
            <div className="icon-placeholder">
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2>Próximamente</h2>
            <p>
              Estamos trabajando en esta funcionalidad para ofrecerte la mejor
              experiencia en la gestión de resúmenes de tus reuniones.
            </p>
            <div className="features-preview">
              <h3>Características que incluirá:</h3>
              <ul>
                <li>📝 Transcripciones automáticas de reuniones</li>
                <li>🔍 Búsqueda inteligente en resúmenes</li>
                <li>📊 Estadísticas y métricas de reuniones</li>
                <li>💾 Descarga de resúmenes en PDF</li>
                <li>🏷️ Etiquetado y organización personalizada</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resumenes;
