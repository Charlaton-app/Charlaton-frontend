import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import WebContentReader from "../../components/web-reader/WebContentReader";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import { useToastContext } from "../../contexts/ToastContext";
import "./Profile.scss";

const parseCreatedAt = (value?: any): Date | null => {
  if (!value) return null;

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }

  if (typeof value === "object") {
    if ("_seconds" in value && typeof value._seconds === "number") {
      return new Date(value._seconds * 1000);
    }
    if ("seconds" in value && typeof value.seconds === "number") {
      return new Date(value.seconds * 1000);
    }
  }

  return null;
};

const formatMemberSince = (value?: any) => {
  const date = parseCreatedAt(value);
  if (!date) return "Información no disponible";
  return date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastContext();
  const { user, updateUserProfile, changePassword, deleteAccount, isLoading } =
    useAuthStore();
  const isOAuthUser = user?.authProvider && user.authProvider !== "password";

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    edad: "",
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Cargar datos del usuario cuando el componente se monta o el usuario cambia
  useEffect(() => {
    if (user) {
      const fullName = user.displayName || user.nickname || "";
      setPersonalInfo({
        fullName: fullName,
        email: user.email || "",
        edad: user.edad ? String(user.edad) : "",
      });
    }
  }, [user]);

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPersonalInfo({
      ...personalInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveChanges = async () => {
    if (!personalInfo.fullName.trim()) {
      toast.error("El nombre completo es requerido");
      return;
    }

    if (!personalInfo.email.trim()) {
      toast.error("El correo electrónico es requerido");
      return;
    }

    if (!personalInfo.edad || !personalInfo.edad.trim()) {
      toast.error("La edad es requerida");
      return;
    }

    const edadNum = parseInt(personalInfo.edad, 10);
    if (isNaN(edadNum) || edadNum < 1 || edadNum > 120) {
      toast.error("Por favor, ingresa una edad válida (entre 1 y 120)");
      return;
    }

    if (!personalInfo.edad || !personalInfo.edad.trim()) {
      setError("La edad es requerida");
      return;
    }

    const edadNum = parseInt(personalInfo.edad, 10);
    if (isNaN(edadNum) || edadNum < 1 || edadNum > 120) {
      setError("Por favor, ingresa una edad válida (entre 1 y 120)");
      return;
    }

    const result = await updateUserProfile({
      displayName: personalInfo.fullName.trim(),
      nickname: personalInfo.fullName.trim(),
      email: personalInfo.email.trim(),
      edad: edadNum,
    });

    if (result.success) {
      toast.success("Cambios guardados exitosamente");
    } else {
      toast.error(result.error || "Error al guardar los cambios");
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const result = await changePassword(
      passwordData.currentPassword,
      passwordData.newPassword,
      passwordData.confirmPassword
    );

    if (result.success) {
      toast.success("Contraseña actualizada correctamente");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else {
      toast.error(result.error || "Error al cambiar la contraseña");
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);

    const result = await deleteAccount();

    if (result.success) {
      navigate("/");
    } else {
      toast.error(result.error || "Error al eliminar la cuenta");
    }
  };

  // Mock stats data
  const resumeCount = 2;
  const sessionCount = 24;
  const memberSince = formatMemberSince(user?.createdAt);

  return (
    <div className="profile-page">
      <WebContentReader />
      <a href="#main-content" className="skip-to-main">
        Saltar al contenido principal
      </a>

      <Navbar />

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Eliminar cuenta"
        message="¿Estás ABSOLUTAMENTE seguro de que deseas eliminar tu cuenta? Esta acción es irreversible y perderás todos tus datos, incluyendo resúmenes, sesiones y configuraciones. No podrás recuperar tu cuenta después de eliminarla."
        confirmText="Eliminar cuenta"
        cancelText="Cancelar"
        confirmButtonClass="btn-danger"
        delaySeconds={3}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />

      <main id="main-content" className="profile-main">
        <div className="profile-container">
          <div className="profile-header">
            <h1 className="profile-title">Perfil de Usuario</h1>
            <button
              className="btn-back-dashboard"
              onClick={() => navigate("/dashboard")}
            >
              ← Volver al dashboard
            </button>
          </div>

          <div className="profile-grid">
            {/* User Card */}
            <div className="profile-card user-card">
              <div className="user-avatar" aria-label="Avatar del usuario">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <h2 className="user-name">
                {personalInfo.fullName ||
                  user?.displayName ||
                  user?.nickname ||
                  "Usuario"}
              </h2>
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
                <div className="form-group">
                  <label htmlFor="fullName">Nombre completo</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={personalInfo.fullName}
                    onChange={handlePersonalInfoChange}
                    placeholder="Juan Pérez"
                    disabled={isLoading}
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                    placeholder="user@email.com"
                    disabled={isLoading || Boolean(isOAuthUser)}
                    aria-required="true"
                    aria-describedby={isOAuthUser ? "email-help" : undefined}
                  />
                  {isOAuthUser && (
                    <p id="email-help" className="field-note">
                      Este correo proviene de{" "}
                      {user?.authProvider?.toUpperCase()} y no puede editarse.
                      Si necesitas cambiarlo, actualízalo directamente en el
                      proveedor.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="edad">Edad</label>
                  <input
                    type="number"
                    id="edad"
                    name="edad"
                    value={personalInfo.edad}
                    onChange={handlePersonalInfoChange}
                    placeholder="18"
                    min="1"
                    max="120"
                    disabled={isLoading}
                    aria-required="true"
                    aria-describedby="edad-help"
                  />
                  <p id="edad-help" className="field-note">
                    Edad entre 1 y 120 años
                  </p>
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

              <form
                onSubmit={handleChangePasswordSubmit}
                className="password-form"
              >
                <div className="form-group">
                  <label htmlFor="currentPassword">
                    Digita tu contraseña actual
                  </label>
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
                  <label htmlFor="newPassword">
                    Digita tu nueva contraseña
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nueva contraseña"
                    disabled={isLoading}
                    aria-required="true"
                    aria-describedby="password-length-help"
                  />
                  <span id="password-length-help" className="visually-hidden">
                    La contraseña debe tener al menos 6 caracteres
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    Confirma tu nueva contraseña
                  </label>
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
                onClick={() => setShowDeleteModal(true)}
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
