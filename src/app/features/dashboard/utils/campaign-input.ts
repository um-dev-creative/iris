import { Campaign, CampaignRecipient } from '../../../core/models';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_RECIPIENTS = 5000;

const HEADER_NAMES = ['identifier', 'identificador', 'email', 'correo', 'phone', 'telefono', 'teléfono'];

export interface ParsedRecipients {
  recipients: CampaignRecipient[];
  /** Cantidad de filas repetidas (mismo identificador) que se descartaron. */
  duplicates: number;
  /** Números de línea (base 1) sin identificador. */
  invalidLines: number[];
}

/**
 * Lee destinatarios de texto pegado o de un CSV: una persona por línea, `identificador[,nombre]` separado por coma,
 * punto y coma o tabulador. Ignora líneas vacías y una cabecera (`email`, `identifier`…) y descarta los repetidos
 * (sin distinguir mayúsculas).
 */
export function parseRecipients(text: string): ParsedRecipients {
  const seen = new Set<string>();
  const recipients: CampaignRecipient[] = [];
  const invalidLines: number[] = [];
  let duplicates = 0;

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === '') return;
    const [identifier = '', name = ''] = line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ''));
    if (index === 0 && HEADER_NAMES.includes(identifier.toLowerCase())) return;
    if (identifier === '') {
      invalidLines.push(index + 1);
      return;
    }
    const key = identifier.toLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    recipients.push(name === '' ? { identifier } : { identifier, name });
  });

  return { recipients, duplicates, invalidLines };
}

/** Texto editable de los destinatarios de una campaña (una línea por persona). */
export function recipientsToText(recipients: readonly CampaignRecipient[]): string {
  return recipients.map((r) => (r.name ? `${r.identifier},${r.name}` : r.identifier)).join('\n');
}

export interface ParsedParams {
  params: Record<string, string>;
  /** Números de línea (base 1) que no tienen la forma `clave=valor`. */
  invalidLines: number[];
}

/** Lee parámetros de plantilla, una línea `clave=valor` cada una. La clave es un nombre FreeMarker válido. */
export function parseParams(text: string): ParsedParams {
  const params: Record<string, string> = {};
  const invalidLines: number[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === '') return;
    const at = line.indexOf('=');
    const key = at > 0 ? line.slice(0, at).trim() : '';
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      invalidLines.push(index + 1);
      return;
    }
    params[key] = line.slice(at + 1).trim();
  });
  return { params, invalidLines };
}

export const paramsToText = (params: Record<string, unknown> | null | undefined): string =>
  Object.entries(params ?? {}).map(([key, value]) => `${key}=${String(value ?? '')}`).join('\n');

/** `true` salvo que Mercury diga expresamente que está pausada. */
export const isEnabled = (campaign: Pick<Campaign, 'enabled'>): boolean => campaign.enabled !== false;

/** De la fecha de Mercury (`2026-03-20 10:00:00` o ISO) al valor de `<input type="datetime-local">`; vacío si no se entiende. */
export function toInputDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
  return match ? `${match[1]}T${match[2]}` : '';
}

/** Del valor de `datetime-local` al `LocalDateTime` de Mercury (con segundos). */
export const fromInputDateTime = (value: string): string | undefined => (value ? `${value}:00` : undefined);

/** Fecha de Mercury como `Date` (sin zona: se toma como hora local); `null` si no se entiende. */
export function toDate(value: string | null | undefined): Date | null {
  const input = toInputDateTime(value);
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Porcentaje entero (0-100) de `part` sobre `total`; 0 si no hay total. */
export const percent = (part: number, total: number): number => (total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0);

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

/** Color de la insignia de un estado de Mercury; un estado desconocido es neutro. */
export function statusTone(status: string): StatusTone {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
    case 'SENT':
      return 'success';
    case 'SCHEDULED':
    case 'ACTIVE':
    case 'IN_PROGRESS':
    case 'RUNNING':
      return 'primary';
    case 'FAILED':
    case 'CANCELLED':
      return 'danger';
    case 'DRAFT':
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
}
