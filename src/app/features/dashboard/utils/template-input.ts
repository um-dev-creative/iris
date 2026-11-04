import { TemplateProblem } from '../../../core/models';

export type EditorFormat = 'HTML' | 'MD';

export const EDITOR_EXTENSIONS: Record<EditorFormat, string> = { HTML: 'html', MD: 'md' };

/** Mismas reglas que Mercury (`TemplateNames`): un nombre de archivo, nunca una ruta. */
export const TEMPLATE_FILE_NAME = /^(?=.{1,128}$)[A-Za-z0-9][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)*\.(ftl|ftlh|md|html)$/;

/**
 * Nombre de archivo a partir de la descripción: minúsculas, sin acentos, guiones en lugar de lo que no sea letra o número.
 * @example fileNameFor('Bienvenida: ¡Hola!', 'MD') // 'bienvenida-hola.md'
 */
export function fileNameFor(description: string, format: EditorFormat): string {
  const slug = description
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug === '' ? '' : `${slug}.${EDITOR_EXTENSIONS[format]}`;
}

/** Formato del editor para un archivo; `.ftl`, `.ftlh` y `.html` son HTML. */
export const formatOfFile = (name: string): EditorFormat => (name.endsWith('.md') ? 'MD' : 'HTML');

/** Cambia la extensión de un nombre al formato elegido, conservando el resto. */
export function withFormat(name: string, format: EditorFormat): string {
  return name === '' ? '' : name.replace(/\.[A-Za-z0-9]+$/, `.${EDITOR_EXTENSIONS[format]}`);
}

/** Posición (índice) del inicio de la línea `line` (desde 1) y de su fin, para seleccionarla en un `<textarea>`. */
export function lineRange(text: string, line: number): { start: number; end: number } {
  const lines = text.split('\n');
  const target = Math.min(Math.max(line, 1), lines.length);
  const start = lines.slice(0, target - 1).reduce((sum, l) => sum + l.length + 1, 0);
  return { start, end: start + lines[target - 1].length };
}

/** Texto de un problema para mostrarlo: «Línea 3, columna 5: …». */
export const describeProblem = (problem: TemplateProblem): string =>
  problem.line > 0 ? `Línea ${problem.line}${problem.column > 0 ? `, columna ${problem.column}` : ''}: ${problem.message}` : problem.message;

/** Líneas `clave=` para los parámetros detectados que aún no tienen valor de ejemplo. */
export function withDetectedParams(current: string, detected: readonly string[]): string {
  const known = new Set(current.split(/\r?\n/).map((line) => line.split('=')[0].trim()).filter(Boolean));
  const missing = detected.filter((name) => !known.has(name));
  if (missing.length === 0) return current;
  const base = current.trim() === '' ? '' : current.replace(/\s+$/, '') + '\n';
  return base + missing.map((name) => `${name}=`).join('\n');
}

/** Documento para el `iframe` de la vista previa: sin scripts ni recursos externos activos, con estilos propios permitidos. */
export function previewDocument(html: string): string {
  const policy = "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; font-src data:";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><base target="_blank"></head><body>${html}</body></html>`;
}
