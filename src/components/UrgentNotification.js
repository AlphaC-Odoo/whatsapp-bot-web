import React, { useState, useMemo } from 'react';

// Avisos que ya vio Mitzi (los cerró con la X). Se guardan en el navegador como
// "id|desde": si una conversación tiene un evento nuevo, su `desde` cambia y la
// notificación vuelve a salir. Lo que sí es definitivo (revisada) vive en Cosmos.
const CLAVE_VISTOS = 'urgentes_vistos';

const leerVistos = () => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_VISTOS) || '[]');
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
};

const claveDe = (conversacion) => `${conversacion.id}|${conversacion.urgency?.desde || ''}`;

/**
 * Notificación roja arriba a la derecha con cuántas conversaciones urgentes hay
 * de cada tipo. Se cierra con la X y solo vuelve a salir con avisos nuevos.
 * Al hacer clic en un tipo se abre la conversación más reciente de ese tipo.
 */
const UrgentNotification = ({ urgentes, onSelectConversation }) => {
  const [vistos, setVistos] = useState(leerVistos);

  const hayNuevos = useMemo(
    () => urgentes.some(u => !vistos.includes(claveDe(u))),
    [urgentes, vistos]
  );

  // Conteo por tipo, en el orden en que aparece cada tipo (las urgentes ya
  // vienen de la más reciente a la más antigua).
  const porTipo = useMemo(() => {
    const tipos = new Map();
    urgentes.forEach(u => {
      const tipo = u.urgency?.tipo;
      if (!tipo) return;
      if (!tipos.has(tipo)) {
        tipos.set(tipo, { etiqueta: u.urgency.etiqueta, cantidad: 0, primera: u });
      }
      tipos.get(tipo).cantidad += 1;
    });
    return [...tipos.values()];
  }, [urgentes]);

  if (!hayNuevos || urgentes.length === 0) return null;

  const cerrar = () => {
    const claves = urgentes.map(claveDe);
    try {
      localStorage.setItem(CLAVE_VISTOS, JSON.stringify(claves));
    } catch {
      // Sin almacenamiento del navegador solo se oculta en esta sesión
    }
    setVistos(claves);
  };

  // Debajo del encabezado del chat, para no tapar "Información del lead"
  return (
    <div
      className="fixed top-20 right-4 z-50 w-64 max-w-[calc(100vw-1.5rem)] bg-red-600 text-white rounded-xl shadow-lg p-3"
      role="alert"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">
          🔔 {urgentes.length} {urgentes.length === 1 ? 'conversación urgente' : 'conversaciones urgentes'}
        </span>
        <button
          onClick={cerrar}
          className="text-white hover:bg-red-700 rounded p-1 -mr-1"
          title="Cerrar (vuelve a salir con avisos nuevos)"
          aria-label="Cerrar notificación"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ul className="text-xs space-y-0.5">
        {porTipo.map(t => (
          <li key={t.etiqueta}>
            <button
              onClick={() => onSelectConversation(t.primera)}
              className="w-full flex justify-between rounded px-1 py-0.5 hover:bg-red-700 text-left"
              title={`Abrir la más reciente: ${t.etiqueta}`}
            >
              <span>{t.etiqueta}</span>
              <span className="font-semibold">{t.cantidad}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UrgentNotification;
