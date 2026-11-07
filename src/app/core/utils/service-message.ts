import { HttpErrorResponse } from '@angular/common/http';

const MAX_LENGTH = 200;
/** `Warning: 199 - "text"` is the standard shape of that header; backbone usually sends the text alone. */
const WARNING_SHAPE = /^\d{3}\s+\S+\s+"(.*)"$/;

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(WARNING_SHAPE, '$1').trim();
  return cleaned === '' ? null : cleaned.slice(0, MAX_LENGTH);
};

/**
 * The reason a service gave for refusing a call, in its own words, or null when it gave none. Mercury and the BFF put it in the
 * body (`message` or `error`); Backbone sends an empty body and says it in the `Message-header` or `Warning` header
 * ("User previously exist.", "E-mail previously exist.").
 */
export function serviceMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (body !== null && typeof body === 'object') {
    const { message, error: reason } = body as { message?: unknown; error?: unknown };
    const fromBody = text(message) ?? text(reason);
    if (fromBody) return fromBody;
  }
  return text(error.headers?.get('Message-header')) ?? text(error.headers?.get('Warning'));
}
