import { content } from '../content';

/**
 * Acceso directo a WhatsApp (pedido del cliente: "más protagonismo"). Solo aparece cuando el
 * número está cargado en el panel (Contacto → WhatsApp); hasta entonces no se muestra (P-14).
 * Enlace externo a wa.me con rel="noopener noreferrer": no se carga ningún script de terceros.
 */
export function WhatsAppButton() {
  const digits = content.contact.whatsapp?.replace(/\D/g, '') ?? '';
  if (digits.length < 8) return null;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 bottom-4 z-30 flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-text-on-dark shadow-lg hover:bg-primary-hover"
      data-testid="whatsapp"
    >
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z" />
      </svg>
      Escríbenos por WhatsApp
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}
