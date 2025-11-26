import React, { useState } from "react";
import Modal from "../Modal/Modal";
import "./Footer.scss";
import useAuthStore from "../../stores/useAuthStore";

type ModalContent =
  | "contact"
  | "faq"
  | "manual"
  | "speed-test"
  | "privacy"
  | "terms"
  | "cookies"
  | "accessibility"
  | null;

const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalContent>(null);
  const { user } = useAuthStore();

  const openModal = (modal: ModalContent) => setActiveModal(modal);
  const closeModal = () => setActiveModal(null);

  const renderModalContent = () => {
    switch (activeModal) {
      case "contact":
        return (
          <Modal isOpen={true} onClose={closeModal} title="Contáctanos">
            <div>
              <p>
                Estamos aquí para ayudarte. Puedes comunicarte con nuestro
                equipo de soporte a través de los siguientes canales:
              </p>

              <h3>Correo Electrónico</h3>
              <p>
                <strong>Soporte General:</strong>{" "}
                <a href="mailto:soporte@charlaton.com">soporte@charlaton.com</a>
                <br />
                <strong>Ventas:</strong>{" "}
                <a href="mailto:ventas@charlaton.com">ventas@charlaton.com</a>
                <br />
                <strong>Asuntos Técnicos:</strong>{" "}
                <a href="mailto:tecnico@charlaton.com">tecnico@charlaton.com</a>
              </p>

              <h3>Teléfono</h3>
              <p>
                <strong>Nacional:</strong> +57 (1) 123-4567
                <br />
                <strong>Internacional:</strong> +1 (800) 555-0123
                <br />
                <strong>Horario:</strong> Lunes a Viernes, 8:00 AM - 6:00 PM
                (GMT-5)
              </p>

              <h3>Chat en Vivo</h3>
              <p>
                Disponible en nuestra plataforma de lunes a viernes de 9:00 AM a
                5:00 PM. Inicia sesión y haz clic en el ícono de chat en la
                esquina inferior derecha.
              </p>

              <h3>Redes Sociales</h3>
              <p>
                También puedes contactarnos a través de nuestras redes sociales:
              </p>
              <ul>
                <li>Facebook: @CharlatonOficial</li>
                <li>Twitter: @Charlaton</li>
                <li>LinkedIn: Charlaton Company</li>
              </ul>

              <h3>Tiempo de Respuesta</h3>
              <p>
                Nos esforzamos por responder todas las consultas en un plazo de
                24 horas durante días hábiles. Para problemas urgentes, te
                recomendamos usar nuestro chat en vivo o línea telefónica.
              </p>
            </div>
          </Modal>
        );

      case "faq":
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="Preguntas Frecuentes"
          >
            <div>
              <h3>¿Cómo puedo crear una cuenta?</h3>
              <p>
                Haz clic en "Registrarse" en la página principal, completa el
                formulario con tus datos o usa tu cuenta de Google/Facebook.
                Recibirás un correo de confirmación para activar tu cuenta.
              </p>

              <h3>¿Es necesario descargar algún programa?</h3>
              <p>
                No, Charlaton funciona completamente en tu navegador web. Solo
                necesitas una conexión a internet estable y un navegador
                actualizado (Chrome, Firefox, Safari o Edge).
              </p>

              <h3>¿Cuántos participantes pueden unirse a una reunión?</h3>
              <p>
                El plan gratuito permite hasta 10 participantes. Los planes
                Premium permiten hasta 100 participantes, y el plan Enterprise
                soporta hasta 500 participantes simultáneos.
              </p>

              <h3>¿Puedo grabar mis reuniones?</h3>
              <p>
                Sí, la función de grabación está disponible en todos los planes
                de pago. Las grabaciones se guardan en la nube y están
                disponibles por 30 días. Puedes descargarlas en cualquier
                momento.
              </p>

              <h3>¿Qué requisitos técnicos necesito?</h3>
              <p>
                Necesitas una cámara web, micrófono, altavoces o auriculares, y
                una conexión a internet de al menos 3 Mbps para video HD.
                Recomendamos usar un ordenador o tablet para la mejor
                experiencia.
              </p>

              <h3>¿Cómo comparto mi pantalla?</h3>
              <p>
                Durante una videollamada, haz clic en el botón "Compartir
                pantalla" en la barra de herramientas. Selecciona qué ventana o
                aplicación deseas compartir y confirma.
              </p>

              <h3>¿Puedo programar reuniones con anticipación?</h3>
              <p>
                Sí, desde tu dashboard puedes programar reuniones futuras,
                enviar invitaciones por correo y añadir las reuniones a tu
                calendario.
              </p>

              <h3>¿Cómo cancelo mi suscripción?</h3>
              <p>
                Ve a Configuración &gt; Facturación y haz clic en "Cancelar
                suscripción". Tu acceso Premium continuará hasta el final del
                período de facturación actual.
              </p>
            </div>
          </Modal>
        );

      case "manual":
        return (
          <Modal isOpen={true} onClose={closeModal} title="Manual de Usuario">
            <div>
              <h3>Comenzando con Charlaton</h3>
              <p>
                Esta guía te ayudará a aprovechar al máximo nuestra plataforma
                de videoconferencia.
              </p>

              <h3>1. Crear tu Primera Reunión</h3>
              <ol>
                <li>Inicia sesión en tu cuenta de Charlaton</li>
                <li>Haz clic en "Iniciar Reunión" en tu dashboard</li>
                <li>Configura tu cámara y micrófono cuando se te solicite</li>
                <li>Comparte el enlace de la reunión con los participantes</li>
              </ol>

              <h3>2. Unirse a una Reunión</h3>
              <ol>
                <li>Haz clic en el enlace de invitación que recibiste</li>
                <li>Ingresa tu nombre si no has iniciado sesión</li>
                <li>Permite el acceso a tu cámara y micrófono</li>
                <li>Haz clic en "Unirse a la reunión"</li>
              </ol>

              <h3>3. Controles Durante la Reunión</h3>
              <ul>
                <li>
                  <strong>Micrófono:</strong> Activar/desactivar tu audio
                </li>
                <li>
                  <strong>Cámara:</strong> Activar/desactivar tu video
                </li>
                <li>
                  <strong>Compartir pantalla:</strong> Mostrar tu pantalla a
                  otros participantes
                </li>
                <li>
                  <strong>Chat:</strong> Enviar mensajes a todos o participantes
                  específicos
                </li>
                <li>
                  <strong>Participantes:</strong> Ver la lista de asistentes
                </li>
                <li>
                  <strong>Grabar:</strong> Iniciar/detener grabación (planes
                  Premium)
                </li>
              </ul>

              <h3>4. Funciones Avanzadas</h3>
              <p>
                <strong>Fondos Virtuales:</strong> Cambia tu fondo para mayor
                privacidad o profesionalismo.
              </p>
              <p>
                <strong>Sala de Espera:</strong> Controla quién puede entrar a
                tu reunión.
              </p>
              <p>
                <strong>Compartir Archivos:</strong> Arrastra archivos al chat
                para compartirlos con todos.
              </p>
              <p>
                <strong>Pizarra Compartida:</strong> Colabora visualmente con tu
                equipo en tiempo real.
              </p>

              <h3>5. Consejos para Mejores Reuniones</h3>
              <ul>
                <li>Prueba tu equipo antes de reuniones importantes</li>
                <li>Usa auriculares para evitar eco</li>
                <li>Asegura buena iluminación frente a ti</li>
                <li>Silencia tu micrófono cuando no estés hablando</li>
                <li>Cierra aplicaciones innecesarias para mejor rendimiento</li>
              </ul>

              <h3>Soporte Adicional</h3>
              <p>
                ¿Necesitas más ayuda? Visita nuestro{" "}
                <a href="#">Centro de Ayuda</a> o contáctanos en{" "}
                <a href="mailto:soporte@charlaton.com">soporte@charlaton.com</a>
              </p>
            </div>
          </Modal>
        );

      case "speed-test":
        return (
          <Modal isOpen={true} onClose={closeModal} title="Test de Velocidad">
            <div>
              <h3>Verifica tu Conexión a Internet</h3>
              <p>
                Una conexión estable es esencial para videoconferencias de
                calidad. Usa esta herramienta para verificar si tu conexión
                cumple con los requisitos.
              </p>

              <h3>Requisitos Recomendados</h3>
              <ul>
                <li>
                  <strong>Video en Calidad Estándar:</strong> Mínimo 1.5 Mbps
                  (subida/bajada)
                </li>
                <li>
                  <strong>Video HD:</strong> Mínimo 3 Mbps (subida/bajada)
                </li>
                <li>
                  <strong>Video Full HD:</strong> Mínimo 5 Mbps (subida/bajada)
                </li>
                <li>
                  <strong>Compartir Pantalla:</strong> Adicional 1-2 Mbps
                </li>
              </ul>

              <h3>Cómo Realizar el Test</h3>
              <ol>
                <li>Cierra todas las descargas y aplicaciones de streaming</li>
                <li>
                  Conecta tu dispositivo directamente al router si es posible
                </li>
                <li>Haz clic en el botón "Iniciar Test" a continuación</li>
                <li>
                  Espera a que se complete la prueba (aproximadamente 30
                  segundos)
                </li>
              </ol>

              <div
                style={{
                  textAlign: "center",
                  margin: "2rem 0",
                  padding: "2rem",
                  background: "#F0F8FF",
                  borderRadius: "12px",
                }}
              >
                <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
                  <strong>Estado de Prueba</strong>
                </p>
                <button
                  style={{
                    background: "#0D5E9E",
                    color: "white",
                    padding: "0.75rem 2rem",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Rubik, sans-serif",
                  }}
                  onClick={() => window.open("https://fast.com/es/", "_blank")}
                >
                  Iniciar Test de Velocidad
                </button>
                <p
                  style={{
                    marginTop: "1rem",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                ></p>
              </div>

              <h3>Consejos para Mejorar tu Conexión</h3>
              <ul>
                <li>Usa conexión por cable Ethernet en lugar de WiFi</li>
                <li>Acércate al router si usas WiFi</li>
                <li>Cierra pestañas del navegador que no uses</li>
                <li>
                  Limita el uso de internet por otros dispositivos durante la
                  reunión
                </li>
                <li>
                  Contacta a tu proveedor si la velocidad es constantemente baja
                </li>
              </ul>
            </div>
          </Modal>
        );

      case "privacy":
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="Política de Privacidad"
          >
            <div>
              <p>
                <em>Última actualización: 18 de noviembre de 2025</em>
              </p>

              <h3>1. Información que Recopilamos</h3>
              <p>
                En Charlaton, recopilamos la siguiente información cuando usas
                nuestra plataforma:
              </p>
              <ul>
                <li>
                  <strong>Información de cuenta:</strong> nombre, correo
                  electrónico, foto de perfil
                </li>
                <li>
                  <strong>Información técnica:</strong> dirección IP, tipo de
                  navegador, sistema operativo
                </li>
                <li>
                  <strong>Información de uso:</strong> fechas y duración de
                  reuniones, participantes
                </li>
                <li>
                  <strong>Contenido de comunicaciones:</strong> mensajes de
                  chat, archivos compartidos (con tu consentimiento)
                </li>
              </ul>

              <h3>2. Cómo Usamos tu Información</h3>
              <p>Utilizamos tu información para:</p>
              <ul>
                <li>
                  Proporcionar y mejorar nuestros servicios de videoconferencia
                </li>
                <li>Personalizar tu experiencia en la plataforma</li>
                <li>Comunicarnos contigo sobre actualizaciones y soporte</li>
                <li>Garantizar la seguridad y prevenir fraudes</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>

              <h3>3. Compartir Información</h3>
              <p>
                No vendemos tu información personal. Solo compartimos datos con:
              </p>
              <ul>
                <li>
                  Proveedores de servicios que nos ayudan a operar la plataforma
                </li>
                <li>Autoridades cuando la ley lo requiera</li>
                <li>
                  Otros usuarios, solo la información que elijas compartir
                  durante las reuniones
                </li>
              </ul>

              <h3>4. Seguridad de Datos</h3>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para
                proteger tu información:
              </p>
              <ul>
                <li>
                  Cifrado de extremo a extremo para todas las comunicaciones
                </li>
                <li>
                  Almacenamiento seguro en servidores con certificación ISO
                  27001
                </li>
                <li>Acceso restringido solo a personal autorizado</li>
                <li>Auditorías de seguridad regulares</li>
              </ul>

              <h3>5. Tus Derechos</h3>
              <p>Tienes derecho a:</p>
              <ul>
                <li>Acceder a tu información personal</li>
                <li>Corregir datos inexactos</li>
                <li>Solicitar la eliminación de tus datos</li>
                <li>Oponerte al procesamiento de tus datos</li>
                <li>Exportar tus datos en formato portable</li>
              </ul>

              <h3>6. Retención de Datos</h3>
              <p>
                Conservamos tu información mientras tu cuenta esté activa y
                durante un período adicional para cumplir con obligaciones
                legales. Las grabaciones se retienen por 30 días o según tu
                configuración de plan.
              </p>

              <h3>7. Cookies y Tecnologías Similares</h3>
              <p>
                Usamos cookies para mejorar tu experiencia. Puedes configurar tu
                navegador para rechazar cookies, pero esto puede afectar la
                funcionalidad del sitio. Ver nuestra{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    openModal("cookies");
                  }}
                >
                  Política de Cookies
                </a>
                .
              </p>

              <h3>8. Cambios a esta Política</h3>
              <p>
                Podemos actualizar esta política ocasionalmente. Te
                notificaremos de cambios significativos por correo electrónico o
                mediante aviso en la plataforma.
              </p>

              <h3>Contacto</h3>
              <p>
                Para preguntas sobre privacidad, contáctanos en:{" "}
                <a href="mailto:privacidad@charlaton.com">
                  privacidad@charlaton.com
                </a>
              </p>
            </div>
          </Modal>
        );

      case "terms":
        return (
          <Modal isOpen={true} onClose={closeModal} title="Términos de Uso">
            <div>
              <p>
                <em>Última actualización: 18 de noviembre de 2025</em>
              </p>

              <h3>1. Aceptación de Términos</h3>
              <p>
                Al acceder y usar Charlaton, aceptas estar sujeto a estos
                Términos de Uso. Si no estás de acuerdo, no uses nuestros
                servicios.
              </p>

              <h3>2. Descripción del Servicio</h3>
              <p>
                Charlaton proporciona una plataforma de videoconferencia que
                permite a usuarios comunicarse mediante video, audio, chat de
                texto y compartir archivos. Ofrecemos tanto planes gratuitos
                como de pago con diferentes características.
              </p>

              <h3>3. Registro y Cuenta</h3>
              <p>Para usar nuestros servicios debes:</p>
              <ul>
                <li>
                  Tener al menos 18 años de edad o contar con permiso parental
                </li>
                <li>Proporcionar información precisa y actualizada</li>
                <li>Mantener la confidencialidad de tu contraseña</li>
                <li>
                  Notificarnos inmediatamente de cualquier uso no autorizado
                </li>
              </ul>

              <h3>4. Uso Aceptable</h3>
              <p>Al usar Charlaton, te comprometes a NO:</p>
              <ul>
                <li>Violar leyes o regulaciones aplicables</li>
                <li>Infringir derechos de propiedad intelectual</li>
                <li>Acosar, amenazar o intimidar a otros usuarios</li>
                <li>Distribuir malware o contenido malicioso</li>
                <li>Realizar actividades fraudulentas o engañosas</li>
                <li>Interferir con el funcionamiento de la plataforma</li>
                <li>Intentar acceder a cuentas de otros usuarios</li>
              </ul>

              <h3>5. Contenido del Usuario</h3>
              <p>
                Eres responsable del contenido que compartes en Charlaton. Al
                publicar contenido, otorgas a Charlaton una licencia limitada
                para almacenar, transmitir y mostrar ese contenido según sea
                necesario para proporcionar el servicio.
              </p>

              <h3>6. Planes de Pago y Facturación</h3>
              <ul>
                <li>
                  Los planes de pago se facturan mensual o anualmente según tu
                  elección
                </li>
                <li>Las renovaciones son automáticas a menos que canceles</li>
                <li>
                  Los precios pueden cambiar con notificación previa de 30 días
                </li>
                <li>
                  Las cancelaciones surten efecto al final del período de
                  facturación
                </li>
                <li>
                  No ofrecemos reembolsos parciales por períodos no utilizados
                </li>
              </ul>

              <h3>7. Propiedad Intelectual</h3>
              <p>
                Charlaton y su contenido (incluyendo diseño, código, logos y
                marcas) son propiedad de Charlaton Company LLC y están
                protegidos por leyes de propiedad intelectual.
              </p>

              <h3>8. Limitación de Responsabilidad</h3>
              <p>
                Charlaton se proporciona "tal cual" sin garantías de ningún
                tipo. No somos responsables por:
              </p>
              <ul>
                <li>Interrupciones del servicio o errores técnicos</li>
                <li>Pérdida de datos o contenido</li>
                <li>Daños indirectos o consecuentes</li>
                <li>Contenido compartido por otros usuarios</li>
              </ul>

              <h3>9. Modificación y Terminación</h3>
              <p>
                Nos reservamos el derecho de modificar o discontinuar el
                servicio en cualquier momento. Podemos suspender o terminar tu
                cuenta si violas estos términos.
              </p>

              <h3>10. Ley Aplicable</h3>
              <p>
                Estos términos se rigen por las leyes de Colombia. Cualquier
                disputa se resolverá en los tribunales de Bogotá, Colombia.
              </p>

              <h3>Contacto</h3>
              <p>
                Para preguntas sobre estos términos:{" "}
                <a href="mailto:legal@charlaton.com">legal@charlaton.com</a>
              </p>
            </div>
          </Modal>
        );

      case "cookies":
        return (
          <Modal isOpen={true} onClose={closeModal} title="Política de Cookies">
            <div>
              <p>
                <em>Última actualización: 18 de noviembre de 2025</em>
              </p>

              <h3>¿Qué son las Cookies?</h3>
              <p>
                Las cookies son pequeños archivos de texto que se almacenan en
                tu dispositivo cuando visitas un sitio web. Nos ayudan a mejorar
                tu experiencia recordando tus preferencias y proporcionando
                funcionalidad esencial.
              </p>

              <h3>Tipos de Cookies que Usamos</h3>

              <h4>1. Cookies Esenciales (Obligatorias)</h4>
              <p>
                Estas cookies son necesarias para que el sitio funcione
                correctamente:
              </p>
              <ul>
                <li>
                  <strong>Autenticación:</strong> Mantienen tu sesión activa
                </li>
                <li>
                  <strong>Seguridad:</strong> Protegen contra ataques y fraudes
                </li>
                <li>
                  <strong>Preferencias de usuario:</strong> Recuerdan tu idioma
                  y configuración
                </li>
              </ul>

              <h4>2. Cookies de Rendimiento</h4>
              <p>Nos ayudan a entender cómo usas nuestro sitio:</p>
              <ul>
                <li>Google Analytics: Análisis de tráfico y comportamiento</li>
                <li>Métricas de rendimiento del sitio</li>
                <li>Información sobre errores y problemas técnicos</li>
              </ul>

              <h4>3. Cookies de Funcionalidad</h4>
              <p>Mejoran tu experiencia con características personalizadas:</p>
              <ul>
                <li>Preferencias de visualización (modo oscuro/claro)</li>
                <li>Configuración de video y audio</li>
                <li>Historial de reuniones recientes</li>
              </ul>

              <h4>4. Cookies de Marketing (Opcionales)</h4>
              <p>Usadas para mostrarte contenido relevante:</p>
              <ul>
                <li>Facebook Pixel: Publicidad personalizada</li>
                <li>Google Ads: Campañas de marketing</li>
                <li>Seguimiento de conversiones</li>
              </ul>

              <h3>Duración de las Cookies</h3>
              <ul>
                <li>
                  <strong>Cookies de sesión:</strong> Se eliminan cuando cierras
                  el navegador
                </li>
                <li>
                  <strong>Cookies persistentes:</strong> Permanecen entre 30
                  días y 2 años
                </li>
              </ul>

              <h3>Control de Cookies</h3>
              <p>
                Puedes controlar y eliminar cookies mediante la configuración de
                tu navegador:
              </p>
              <ul>
                <li>
                  <strong>Chrome:</strong> Configuración &gt; Privacidad y
                  seguridad &gt; Cookies
                </li>
                <li>
                  <strong>Firefox:</strong> Opciones &gt; Privacidad y seguridad
                  &gt; Cookies
                </li>
                <li>
                  <strong>Safari:</strong> Preferencias &gt; Privacidad &gt;
                  Gestionar datos de sitios
                </li>
                <li>
                  <strong>Edge:</strong> Configuración &gt; Privacidad &gt;
                  Cookies
                </li>
              </ul>

              <p
                style={{
                  background: "#FEF3C7",
                  padding: "1rem",
                  borderRadius: "8px",
                  marginTop: "1rem",
                }}
              >
                <strong>Nota:</strong> Bloquear o eliminar cookies puede afectar
                la funcionalidad del sitio y algunas características pueden no
                estar disponibles.
              </p>

              <h3>Cookies de Terceros</h3>
              <p>
                Algunos servicios de terceros que usamos pueden establecer sus
                propias cookies:
              </p>
              <ul>
                <li>Google (Analytics, Fonts, reCAPTCHA)</li>
                <li>Facebook (Autenticación)</li>
                <li>Firebase (Autenticación y base de datos)</li>
              </ul>

              <h3>Actualizaciones de esta Política</h3>
              <p>
                Podemos actualizar esta política de cookies ocasionalmente. Te
                notificaremos de cambios significativos mediante un aviso en
                nuestro sitio web.
              </p>

              <h3>Más Información</h3>
              <p>
                Para más detalles sobre cómo usamos cookies y tu privacidad,
                consulta nuestra
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    openModal("privacy");
                  }}
                >
                  {" "}
                  Política de Privacidad
                </a>{" "}
                o contáctanos en{" "}
                <a href="mailto:privacidad@charlaton.com">
                  privacidad@charlaton.com
                </a>
              </p>
            </div>
          </Modal>
        );

      case "accessibility":
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="Declaración de Accesibilidad"
          >
            <div>
              <p>
                <em>Última actualización: 18 de noviembre de 2025</em>
              </p>

              <h3>Nuestro Compromiso</h3>
              <p>
                Charlaton está comprometido con garantizar la accesibilidad
                digital para personas con discapacidades. Continuamente
                mejoramos la experiencia del usuario para todos, aplicando los
                estándares de accesibilidad relevantes.
              </p>

              <h3>Estándares de Conformidad</h3>
              <p>
                Nuestro objetivo es cumplir con las Pautas de Accesibilidad para
                el Contenido Web (WCAG) 2.1 Nivel AA. Estas pautas explican cómo
                hacer el contenido web más accesible para personas con
                discapacidades.
              </p>

              <h3>Características de Accesibilidad</h3>

              <h4>Navegación por Teclado</h4>
              <ul>
                <li>
                  Todas las funcionalidades son accesibles usando solo el
                  teclado
                </li>
                <li>Indicadores visuales claros para el foco del teclado</li>
                <li>Atajos de teclado para acciones comunes</li>
                <li>Orden de tabulación lógico en toda la plataforma</li>
              </ul>

              <h4>Compatibilidad con Lectores de Pantalla</h4>
              <ul>
                <li>Etiquetas ARIA apropiadas en elementos interactivos</li>
                <li>Texto alternativo para todas las imágenes</li>
                <li>Estructura de encabezados semántica</li>
                <li>Anuncios en vivo para notificaciones importantes</li>
              </ul>

              <h4>Visual</h4>
              <ul>
                <li>
                  Contraste de color que cumple con WCAG AA (ratio mínimo 4.5:1)
                </li>
                <li>
                  Texto redimensionable hasta 200% sin pérdida de funcionalidad
                </li>
                <li>No se usa solo el color para transmitir información</li>
                <li>Opción de modo de alto contraste</li>
              </ul>

              <h4>Audio y Video</h4>
              <ul>
                <li>Subtítulos automáticos en tiempo real (próximamente)</li>
                <li>Controles de volumen ajustables</li>
                <li>Indicadores visuales de audio activo</li>
                <li>Opciones de transcripción de reuniones</li>
              </ul>

              <h4>Contenido y Lenguaje</h4>
              <ul>
                <li>Lenguaje claro y sencillo</li>
                <li>Instrucciones consistentes y predecibles</li>
                <li>Mensajes de error descriptivos</li>
                <li>Etiquetas de formulario explícitas</li>
              </ul>

              <h3>Tecnologías de Asistencia Compatibles</h3>
              <p>Charlaton está diseñado para funcionar con:</p>
              <ul>
                <li>JAWS (Windows)</li>
                <li>NVDA (Windows)</li>
                <li>VoiceOver (macOS, iOS)</li>
                <li>TalkBack (Android)</li>
                <li>Navegadores con zoom y ampliación</li>
                <li>Software de reconocimiento de voz</li>
              </ul>

              <h3>Limitaciones Conocidas</h3>
              <p>
                A pesar de nuestros esfuerzos, algunas áreas pueden presentar
                desafíos de accesibilidad:
              </p>
              <ul>
                <li>
                  Contenido compartido por otros usuarios durante reuniones
                </li>
                <li>Documentos PDF antiguos sin etiquetas apropiadas</li>
                <li>Videos subidos por usuarios sin subtítulos</li>
              </ul>

              <p>
                Estamos trabajando activamente para abordar estas limitaciones.
              </p>

              <h3>Feedback y Asistencia</h3>
              <p>
                Valoramos tus comentarios sobre la accesibilidad de Charlaton.
                Si encuentras alguna barrera de accesibilidad:
              </p>
              <ul>
                <li>
                  Email:{" "}
                  <a href="mailto:accesibilidad@charlaton.com">
                    accesibilidad@charlaton.com
                  </a>
                </li>
                <li>Teléfono: +57 (1) 123-4567</li>
                <li>Formulario de contacto en nuestra página de soporte</li>
              </ul>

              <p>
                Intentaremos responder a tu consulta dentro de 2 días hábiles y
                proporcionar una solución o alternativa cuando sea posible.
              </p>

              <h3>Evaluación y Mejora Continua</h3>
              <p>
                Realizamos evaluaciones de accesibilidad regulares y trabajamos
                continuamente para mejorar. Nuestro equipo recibe capacitación
                continua en mejores prácticas de accesibilidad.
              </p>

              <h3>Aprobación Formal</h3>
              <p>
                Esta declaración de accesibilidad fue aprobada el 18 de
                noviembre de 2025 y será revisada cada 6 meses.
              </p>
            </div>
          </Modal>
        );

      default:
        return null;
    }
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Navegación */}
          <div className="footer-column">
            <h3>Navegación</h3>
            <nav aria-label="Enlaces de navegación del pie de página">
              <ul>
                <li>
                  <a href="/">Inicio</a>
                </li>
                <li>
                  <a href="/about">Sobre nosotros</a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Cuenta - Solo mostrar Dashboard cuando está autenticado */}
          <div className="footer-column">
            <h3>Cuenta</h3>
            <nav aria-label="Enlaces de cuenta">
              <ul>
                {user ? (
                  // Usuario autenticado - mostrar Dashboard, Perfil y Resúmenes
                  <>
                    <li>
                      <a href="/dashboard">Dashboard</a>
                    </li>
                    <li>
                      <a href="/profile">Perfil</a>
                    </li>
                    <li>
                      <a href="/resumenes">Resúmenes</a>
                    </li>
                  </>
                ) : (
                  // Usuario no autenticado - mostrar opciones de inicio de sesión
                  <>
                    <li>
                      <a href="/login">Iniciar sesión</a>
                    </li>
                    <li>
                      <a href="/signup">Registrarte</a>
                    </li>
                    <li>
                      <a href="/recovery">Recuperar Contraseña</a>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </div>

          {/* Ayuda */}
          <div className="footer-column">
            <h3>Ayuda</h3>
            <nav aria-label="Enlaces de ayuda">
              <ul>
                <li>
                  <button
                    onClick={() => openModal("contact")}
                    className="footer-link-button"
                    aria-label="Abrir formulario de contacto"
                  >
                    Contáctanos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("faq")}
                    className="footer-link-button"
                    aria-label="Ver preguntas frecuentes"
                  >
                    Preguntas Frecuentes
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("manual")}
                    className="footer-link-button"
                    aria-label="Abrir manual de usuario"
                  >
                    Manual de Usuario
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("speed-test")}
                    className="footer-link-button"
                    aria-label="Realizar test de velocidad"
                  >
                    Test de Velocidad
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Legal */}
          <div className="footer-column">
            <h3>Legal</h3>
            <nav aria-label="Enlaces legales">
              <ul>
                <li>
                  <button
                    onClick={() => openModal("privacy")}
                    className="footer-link-button"
                    aria-label="Ver política de privacidad"
                  >
                    Privacidad
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("terms")}
                    className="footer-link-button"
                    aria-label="Ver términos de uso"
                  >
                    Términos de Uso
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("cookies")}
                    className="footer-link-button"
                    aria-label="Ver política de cookies"
                  >
                    Cookies
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("accessibility")}
                    className="footer-link-button"
                    aria-label="Ver declaración de accesibilidad"
                  >
                    Accesibilidad
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>@2025 Charlaton Company, LLC. Todos los derechos reservados.</p>

          {/* Social Icons */}
          <nav className="social-icons" aria-label="Redes sociales">
            <a href="#facebook" aria-label="Visitar nuestra página de Facebook">
              <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
            <a
              href="#instagram"
              aria-label="Visitar nuestro perfil de Instagram"
            >
              <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a href="#twitter" aria-label="Visitar nuestro perfil de Twitter">
              <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
            <a href="#linkedin" aria-label="Visitar nuestro perfil de LinkedIn">
              <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </nav>
        </div>
      </div>

      {/* Render active modal */}
      {renderModalContent()}
    </footer>
  );
};

export default Footer;
