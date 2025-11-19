import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Profile.scss";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, changePassword, deleteAccount, logout, isLoading } = useAuthStore();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.displayName || user?.nickname || "Demo User",
    lastName: "",
    email: user?.email || "demo.user@gmail.com",
    age: "20"
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPersonalInfo({
      ...personalInfo,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveChanges = async () => {
    setError("");
    setSuccess("");

    const result = await updateUserProfile({
      displayName: `${personalInfo.name} ${personalInfo.lastName}`.trim(),
      nickname: personalInfo.name,
      email: personalInfo.email
    });

    if (result.success) {
      setSuccess("Cambios guardados exitosamente");
    } else {
      setError(result.error || "Error al guardar los cambios");
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const result = await changePassword(
      passwordData.currentPassword,
      passwordData.newPassword,
      passwordData.confirmPassword
    );

    if (result.success) {
      setSuccess("Contraseña actualizada correctamente");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } else {
      setError(result.error || "Error al cambiar la contraseña");
    }
  };

  const handleDeleteAccount = async () => {
    const password = window.prompt(
      "Por seguridad, ingresa tu contraseña para confirmar la eliminación de tu cuenta:"
    );

    if (!password) return;

    const confirmed = window.confirm(
      "¿Estás ABSOLUTAMENTE seguro de que deseas eliminar tu cuenta? Esta acción es irreversible y perderás todos tus datos."
    );

    if (!confirmed) return;

    setError("");

    const result = await deleteAccount(password);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Error al eliminar la cuenta");
    }
  };

  // Mock stats data
  const resumeCount = 2;
  const sessionCount = 24;
  const memberSince = "Enero del 2024";

  return (
    <div className="profile-page">
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>
      
      <Navbar />
      
      <main id="main-content" className="profile-main">
        <div className="profile-container">
          <h1 className="profile-title">Perfil de Usuario</h1>

          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert" aria-live="polite">
              {success}
            </div>
          )}

          <div className="profile-grid">
            {/* User Card */}
            <div className="profile-card user-card">
              <div className="user-avatar" aria-label="Avatar del usuario">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <h2 className="user-name">{personalInfo.name}</h2>
              <p className="user-email">{personalInfo.email}</p>
              
              <div className="user-stats">
                <div className="stat-item">
                  <div className="stat-value">{resumeCount}</div>
                  <div className="stat-label">Resúmenes</div>
                </div>
                <div className="stat-divider" aria-hidden="true"></div>
                <div className="stat-item">
                  <div className="stat-value">{sessionCount}</div>
                  <div className="stat-label">Sesiones</div>
                </div>
              </div>

              <div className="member-since">
                <p>Miembro desde {memberSince}</p>
              </div>
            </div>

            {/* Personal Information Card */}
            <div className="profile-card info-card">
              <h2>Información personal</h2>
              
              <form className="info-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Nombre</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={personalInfo.name}
                      onChange={handlePersonalInfoChange}
                      placeholder="Demo User"
                      disabled={isLoading}
                      aria-required="true"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">Apellidos</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={personalInfo.lastName}
                      onChange={handlePersonalInfoChange}
                      placeholder="Demo User"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Correo electrónico</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={personalInfo.email}
                      onChange={handlePersonalInfoChange}
                      placeholder="user@email.com"
                      disabled={isLoading}
                      aria-required="true"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="age">Edad</label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={personalInfo.age}
                      onChange={handlePersonalInfoChange}
                      placeholder="20"
                      min="1"
                      max="150"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="member-info">
                  <p>
                    <strong>Fecha de registro</strong>
                  </p>
                  <p>{memberSince}</p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="btn-save"
                  disabled={isLoading}
                  aria-label="Guardar cambios"
                >
                  {isLoading ? "Guardando..." : "GUARDAR CAMBIOS"}
                </button>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="profile-card password-card">
              <h2>Cambia tu contraseña</h2>
              
              <form onSubmit={handleChangePasswordSubmit} className="password-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">Digita tu contraseña actual</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Contraseña actual"
                    disabled={isLoading}
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">Digita tu nueva contraseña</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nueva contraseña"
                    disabled={isLoading}
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirma tu nueva contraseña</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirmar contraseña"
                    disabled={isLoading}
                    aria-required="true"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-change-password"
                  disabled={isLoading}
                  aria-label="Cambiar contraseña"
                >
                  {isLoading ? "Cambiando..." : "CAMBIAR CONTRASEÑA"}
                </button>
              </form>
            </div>

            {/* Danger Zone Card */}
            <div className="profile-card danger-card">
              <h2>Zona de peligro</h2>
              <p className="danger-warning">Esta es una acción irreversible.</p>
              
              <button
                onClick={handleDeleteAccount}
                className="btn-delete"
                disabled={isLoading}
                aria-label="Eliminar cuenta permanentemente"
              >
                {isLoading ? "Eliminando..." : "ELIMINAR CUENTA"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
