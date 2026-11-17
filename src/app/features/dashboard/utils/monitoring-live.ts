import { AlertRule, AlertType, MonitoringRange, SeriesPoint, ServiceState } from '../models/monitoring-live.model';

export const RANGES: { value: MonitoringRange; label: string }[] = [
  { value: '1h', label: '1 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
];

const CHANNEL_LABELS: Record<string, string> = { EMAIL: 'Correo', SMS: 'SMS', TELEGRAM: 'Telegram', WHATSAPP: 'WhatsApp', PUSH: 'Push' };
const KIND_LABELS: Record<string, string> = { TRANSACTIONAL: 'Transaccional', CAMPAIGN: 'Campaña', VERIFICATION_CODE: 'Código de verificación' };

export const channelLabel = (channel: string) => CHANNEL_LABELS[channel] ?? channel;
export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind;

/** Un porcentaje, o «Sin datos»: sin envíos no hay tasa que inventar. */
export const percent = (rate: number | null | undefined) => (rate === null || rate === undefined ? 'Sin datos' : `${(rate * 100).toFixed(1)} %`);

export const formatNumber = (value: number) => value.toLocaleString('es-MX');

/** El estado nunca se transmite solo con color: cada uno lleva su texto. */
export const STATE_LABELS: Record<ServiceState, string> = {
  UP: 'Operativo',
  DEGRADED: 'Degradado',
  DOWN: 'Caído',
  NOT_CONFIGURED: 'No configurado',
  UNKNOWN: 'Sin comprobar',
};
export const OVERALL_LABELS = { OPERATIONAL: 'Todo operativo', DEGRADED: 'Degradación parcial', OUTAGE: 'Hay servicios caídos', UNKNOWN: 'Sin comprobar' } as const;

/** Clases completas (Tailwind solo genera las que encuentra escritas). */
export const STATE_DOT: Record<ServiceState, string> = {
  UP: 'bg-success',
  DEGRADED: 'bg-warning',
  DOWN: 'bg-destructive',
  NOT_CONFIGURED: 'bg-muted-foreground',
  UNKNOWN: 'bg-muted-foreground',
};

/** «2 h 5 min», «45 s»: la duración de una caída. */
export function duration(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return hours % 24 === 0 ? `${days} d` : `${days} d ${hours % 24} h`;
}

const UNIT_MS: Record<string, number> = { minute: 60_000, hour: 3_600_000, day: 86_400_000 };

/** Las fechas de Mercury no llevan zona: son UTC. */
export const parseUtc = (value: string) => new Date(/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);

/** El intervalo `[from, to)` que cubre una barra, en el formato que acepta Mercury (ISO sin zona, UTC). */
export function bucketWindow(point: SeriesPoint, unit: string): { from: string; to: string } {
  const start = parseUtc(point.bucket);
  const end = new Date(start.getTime() + (UNIT_MS[unit] ?? UNIT_MS['hour']));
  const iso = (d: Date) => d.toISOString().slice(0, 19);
  return { from: iso(start), to: iso(end) };
}

/** Etiqueta corta del eje: hora para minuto y hora, día para día. */
export function bucketLabel(bucket: string, unit: string): string {
  const date = parseUtc(bucket);
  const two = (n: number) => String(n).padStart(2, '0');
  return unit === 'day' ? `${two(date.getUTCDate())}/${two(date.getUTCMonth() + 1)}` : `${two(date.getUTCHours())}:${two(date.getUTCMinutes())}`;
}

export const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'FAILURE_RATE', label: 'Tasa de fallos' },
  { value: 'QUEUE_STUCK', label: 'Mensajes detenidos' },
  { value: 'SERVICE_DOWN', label: 'Servicio caído' },
];
/** Los nombres que Mercury da a sus servicios en `/monitoring/health`; una regla «servicio caído» solo acepta estos. */
export const SERVICES = ['POSTGRESQL', 'MONGODB', 'KAFKA', 'SMTP', 'BACKBONE', 'TELEGRAM'];

/** La regla en una frase: qué vigila y cuándo avisa. */
export function ruleLabel(rule: AlertRule): string {
  switch (rule.type) {
    case 'FAILURE_RATE':
      return `Más de ${rule.threshold} % de fallos en ${rule.windowMinutes} min${rule.minVolume > 0 ? ` (mínimo ${rule.minVolume} mensajes)` : ''}`;
    case 'QUEUE_STUCK':
      return `${rule.threshold} mensajes o más esperando más de ${rule.windowMinutes} min`;
    case 'SERVICE_DOWN':
      return `${rule.service ?? 'Un servicio'} degradado o caído durante ${rule.windowMinutes} min`;
  }
}

/** Nombre del archivo de una descarga según `Content-Disposition`, o el de respaldo. */
export function downloadName(header: string | null, fallback: string): string {
  const match = header ? /filename="([^"\\/]{1,100})"/.exec(header) : null;
  return match ? match[1] : fallback;
}

/** Entrega un archivo al navegador. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
