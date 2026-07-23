/**
 * Utilidades para mostrar notificaciones del navegador (Web Notifications API).
 *
 * Escenario soportado: notificaciones del sistema operativo cuando la pestaña
 * está abierta pero en segundo plano (sin foco), igual que WhatsApp Web.
 * No cubre el caso de pestaña/navegador completamente cerrado (eso requeriría
 * Service Worker + Web Push + backend).
 *
 * Requisitos: contexto seguro (HTTPS o localhost) y permiso del usuario.
 */

/** ¿El navegador soporta la Notifications API? */
export const isNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

/** Estado actual del permiso: 'granted' | 'denied' | 'default' | 'unsupported'. */
export const getNotificationPermission = () =>
  isNotificationSupported() ? Notification.permission : 'unsupported';

/**
 * Solicita permiso para mostrar notificaciones.
 * Es seguro llamarla varias veces; si ya está concedido/denegado no vuelve a preguntar.
 * @returns {Promise<string>} el permiso resultante.
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    console.log('🔕 Notificaciones no soportadas por este navegador');
    return 'unsupported';
  }

  if (Notification.permission !== 'default') {
    // Ya fue concedido o denegado previamente: no volver a preguntar.
    return Notification.permission;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log(`🔔 Permiso de notificaciones: ${permission}`);
    return permission;
  } catch (error) {
    console.error('❌ Error al solicitar permiso de notificaciones:', error);
    return getNotificationPermission();
  }
};

/**
 * ¿La pestaña está actualmente visible y con foco?
 * Si el usuario ya está mirando la app, no tiene sentido lanzar una
 * notificación del sistema (ya ve el resaltado interno de la conversación).
 */
const isTabActive = () =>
  document.visibilityState === 'visible' && document.hasFocus();

/**
 * Muestra una notificación del navegador para un mensaje nuevo.
 *
 * @param {Object} params
 * @param {string} params.title - Título (p. ej. el nombre del contacto).
 * @param {string} [params.body] - Cuerpo (p. ej. el último mensaje).
 * @param {string} [params.tag] - Identificador para agrupar/reemplazar
 *   notificaciones de la misma conversación (evita spam).
 * @param {Function} [params.onClick] - Callback al hacer clic en la notificación.
 * @returns {Notification|null}
 */
export const showBrowserNotification = ({ title, body, tag, onClick } = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  // Comportamiento tipo WhatsApp Web: solo notificar cuando la pestaña NO está activa.
  if (isTabActive()) {
    return null;
  }

  try {
    // PUBLIC_URL respeta el subpath de despliegue (p. ej. GitHub Pages).
    const iconUrl = `${process.env.PUBLIC_URL || ''}/logo192.png`;
    const notification = new Notification(title || 'Nuevo mensaje', {
      body: body || '',
      tag, // misma conversación => reemplaza la notificación previa
      icon: iconUrl,
      badge: iconUrl,
      renotify: !!tag,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (typeof onClick === 'function') {
        try {
          onClick();
        } catch (error) {
          console.error('❌ Error en onClick de la notificación:', error);
        }
      }
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('❌ Error al mostrar notificación del navegador:', error);
    return null;
  }
};
