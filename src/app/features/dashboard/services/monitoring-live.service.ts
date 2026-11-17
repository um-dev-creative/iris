import { DestroyRef, Injectable, InjectionToken, NgZone, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import {
  Connection, FailuresResponse, HealthResponse, MessagePage, MessageStatus, MonitoringRange, OutagesResponse, SeriesPoint, SeriesResponse,
  SummaryResponse, VerificationCodeStats,
} from '../models/monitoring-live.model';
import { bucketWindow } from '../utils/monitoring-live';

/** Abre el flujo de eventos; se inyecta para poder sustituirlo en las pruebas. */
export const EVENT_SOURCE_FACTORY = new InjectionToken<(url: string) => EventSource>('EVENT_SOURCE_FACTORY', {
  providedIn: 'root',
  factory: () => (url: string) => new EventSource(url, { withCredentials: true }),
});

const POLL_MS = 30_000;
/** Sin flujo, también el resumen y la salud se consultan, y más a menudo. */
const FALLBACK_POLL_MS = 15_000;
const REOPEN_MS = 60_000;
const PAGE_SIZE = 20;
const RANGE_MS: Record<MonitoringRange, number> = { '1h': 3_600_000, '24h': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 };

/**
 * Estado y datos de la vista de monitoreo. Los filtros (periodo, canal, tipo, estado, intervalo, servicio) son señales compartidas por
 * todas las vistas: cambiar uno vuelve a pedir lo que depende de él. El resumen y la salud llegan por el flujo de eventos de
 * Mercury; el resto se consulta cada 30 s. Si el flujo cae, todo se consulta cada 15 s hasta que vuelva.
 */
@Injectable()
export class MonitoringLiveService {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  private readonly openStream = inject(EVENT_SOURCE_FACTORY);
  private readonly base = `${inject(API_BASE_URL)}/monitoring`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ── filtros ──
  private readonly _range = signal<MonitoringRange>('24h');
  private readonly _channel = signal<string | null>(null);
  private readonly _kind = signal<string | null>(null);
  private readonly _status = signal<MessageStatus | null>(null);
  private readonly _bucket = signal<SeriesPoint | null>(null);
  private readonly _service = signal<string | null>(null);
  private readonly _page = signal(0);
  readonly range = this._range.asReadonly();
  readonly channel = this._channel.asReadonly();
  readonly kind = this._kind.asReadonly();
  readonly status = this._status.asReadonly();
  readonly bucket = this._bucket.asReadonly();
  readonly service = this._service.asReadonly();
  readonly page = this._page.asReadonly();

  // ── datos ──
  readonly summary = signal<SummaryResponse | null>(null);
  readonly series = signal<SeriesResponse | null>(null);
  readonly failures = signal<FailuresResponse | null>(null);
  readonly codes = signal<VerificationCodeStats | null>(null);
  readonly health = signal<HealthResponse | null>(null);
  readonly outages = signal<OutagesResponse | null>(null);
  readonly messages = signal<MessagePage | null>(null);

  private readonly _connection = signal<Connection>('connecting');
  private readonly _loading = signal(false);
  private readonly _stale = signal(false);
  private readonly _lastUpdate = signal<Date | null>(null);
  readonly connection = this._connection.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** `true` si la última consulta falló: lo que se ve puede estar desactualizado. */
  readonly stale = this._stale.asReadonly();
  readonly lastUpdate = this._lastUpdate.asReadonly();

  readonly hasFilters = computed(() => !!(this._channel() || this._kind() || this._status() || this._bucket() || this._service()));
  readonly visibleOutages = computed(() => {
    const service = this._service();
    const all = this.outages()?.outages ?? [];
    return service ? all.filter((o) => o.service === service) : all;
  });
  readonly totalPages = computed(() => {
    const page = this.messages();
    return page ? Math.max(1, Math.ceil(page.total / (page.size || PAGE_SIZE))) : 1;
  });

  private source: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reopenTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  // ── filtros: cada cambio vuelve a pedir lo que depende de él ──
  setRange(range: MonitoringRange): void {
    if (range === this._range()) return;
    this._range.set(range);
    this._bucket.set(null);
    this._page.set(0);
    this.reconnect();
    void this.refreshAll();
  }

  toggleChannel(channel: string): void {
    this._channel.set(this._channel() === channel ? null : channel);
    this.filtersChanged();
  }

  toggleKind(kind: string): void {
    this._kind.set(this._kind() === kind ? null : kind);
    this.filtersChanged();
  }

  toggleStatus(status: MessageStatus): void {
    this._status.set(this._status() === status ? null : status);
    this._page.set(0);
    void this.loadMessages();
  }

  /** Elegir una barra filtra los mensajes de ese intervalo; elegirla otra vez lo quita. */
  toggleBucket(point: SeriesPoint): void {
    this._bucket.set(this._bucket()?.bucket === point.bucket ? null : point);
    this._page.set(0);
    void this.loadMessages();
  }

  /** Elegir un servicio filtra el historial de caídas a ese servicio. */
  toggleService(service: string): void {
    this._service.set(this._service() === service ? null : service);
  }

  /** Una causa de fallo lleva a los mensajes fallidos de su canal. */
  drillIntoFailure(channel: string): void {
    this._channel.set(channel);
    this._status.set('FAILED');
    this._page.set(0);
    void Promise.all([this.loadSeries(), this.loadMessages()]);
  }

  clearFilters(): void {
    this._channel.set(null);
    this._kind.set(null);
    this._status.set(null);
    this._bucket.set(null);
    this._service.set(null);
    this.filtersChanged();
  }

  goToPage(page: number): void {
    const next = Math.min(Math.max(0, page), this.totalPages() - 1);
    if (next === this._page()) return;
    this._page.set(next);
    void this.loadMessages();
  }

  private filtersChanged(): void {
    this._page.set(0);
    void Promise.all([this.loadSeries(), this.loadMessages()]);
  }

  // ── ciclo de vida ──
  /** Empieza a cargar y a mantener los datos al día hasta que `destroyRef` se destruya. */
  start(destroyRef: DestroyRef): void {
    if (this.started) return;
    this.started = true;
    void this.refreshAll();
    if (this.isBrowser) {
      this.connect();
      this.schedulePoll(POLL_MS);
    }
    destroyRef.onDestroy(() => this.stop());
  }

  stop(): void {
    this.started = false;
    this.closeStream();
    if (this.pollTimer !== null) clearInterval(this.pollTimer);
    if (this.reopenTimer !== null) clearTimeout(this.reopenTimer);
    this.pollTimer = null;
    this.reopenTimer = null;
  }

  async refreshAll(): Promise<void> {
    this._loading.set(true);
    const results = await Promise.allSettled([
      this.loadSummary(), this.loadSeries(), this.loadFailures(), this.loadCodes(), this.loadHealth(), this.loadOutages(), this.loadMessages(),
    ]);
    this._loading.set(false);
    this.markResult(results.every((r) => r.status === 'fulfilled'));
  }

  // ── consultas ──
  private params(extra: Record<string, string | number | null | undefined> = {}): HttpParams {
    let params = new HttpParams().set('range', this._range());
    for (const [key, value] of Object.entries(extra)) {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return params;
  }

  private get<T>(path: string, params: HttpParams): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.base}/${path}`, { params }));
  }

  private async load<T>(path: string, params: HttpParams, into: { set(value: T): void }): Promise<void> {
    into.set(await this.get<T>(path, params));
  }

  loadSummary = () => this.load<SummaryResponse>('summary', this.params(), this.summary);
  loadSeries = () => this.load<SeriesResponse>('series', this.params({ channel: this._channel(), kind: this._kind() }), this.series);
  loadFailures = () => this.load<FailuresResponse>('failures', this.params(), this.failures);
  loadCodes = () => this.load<VerificationCodeStats>('verification-codes', this.params(), this.codes);
  loadHealth = () => this.load<HealthResponse>('health', new HttpParams(), this.health);
  loadOutages = () => this.load<OutagesResponse>('outages', this.params(), this.outages);

  loadMessages = () => {
    const bucket = this._bucket();
    // sin una barra elegida, la tabla muestra el periodo elegido, como el resto de las vistas
    const window = bucket
      ? bucketWindow(bucket, this.series()?.unit ?? 'hour')
      : { from: new Date(Date.now() - RANGE_MS[this._range()]).toISOString().slice(0, 19), to: null };
    return this.load<MessagePage>('messages', new HttpParams({ fromObject: this.messageQuery(window) }), this.messages);
  };

  private messageQuery(window: { from: string; to: string | null }): Record<string, string> {
    const query: Record<string, string> = { page: String(this._page()), size: String(PAGE_SIZE) };
    const filters: Record<string, string | null | undefined> = {
      channel: this._channel(), kind: this._kind(), status: this._status(), from: window.from, to: window.to,
    };
    for (const [key, value] of Object.entries(filters)) {
      if (value) query[key] = value;
    }
    return query;
  }

  private markResult(ok: boolean): void {
    this._stale.set(!ok);
    if (ok) this._lastUpdate.set(new Date());
    // sin flujo y sin respuestas no hay datos nuevos: se dice, en vez de seguir mostrando «sondeo»
    if (!ok && this._connection() !== 'live') this._connection.set('offline');
    else if (ok && this._connection() === 'offline') this._connection.set('polling');
  }

  // ── flujo de eventos y sondeo ──
  private connect(): void {
    this.closeStream();
    this._connection.set('connecting');
    let source: EventSource;
    try {
      source = this.openStream(`${this.base}/stream?range=${this._range()}`);
    } catch {
      this.fallBack();
      return;
    }
    this.source = source;
    source.onopen = () => this.zone.run(() => this._connection.set('live'));
    source.addEventListener('summary', (event) => this.zone.run(() => this.onEvent(event, this.summary)));
    source.addEventListener('health', (event) => this.zone.run(() => this.onEvent(event, this.health)));
    source.onerror = () =>
      this.zone.run(() => {
        // CLOSED: el BFF o Mercury rechazaron el flujo (sesión, límite): no reconecta solo, se reintenta más tarde
        if (source.readyState === 2) this.fallBack();
        else this._connection.set('polling');
      });
  }

  private onEvent<T>(event: Event, into: { set(value: T): void }): void {
    try {
      into.set(JSON.parse((event as MessageEvent<string>).data) as T);
      this._connection.set('live');
      this._stale.set(false);
      this._lastUpdate.set(new Date());
    } catch {
      // un evento ilegible no tumba el flujo: el siguiente lo reemplaza
    }
  }

  /** El flujo no está disponible: se consulta todo más a menudo y se reintenta el flujo en un minuto. */
  private fallBack(): void {
    this.closeStream();
    this._connection.set('polling');
    this.schedulePoll(FALLBACK_POLL_MS);
    if (this.reopenTimer !== null) clearTimeout(this.reopenTimer);
    this.zone.runOutsideAngular(() => {
      this.reopenTimer = setTimeout(() => {
        this.reopenTimer = null;
        if (!this.started) return;
        this.schedulePoll(POLL_MS);
        this.zone.run(() => this.connect());
      }, REOPEN_MS);
    });
  }

  private reconnect(): void {
    if (this.isBrowser && this.started) this.connect();
  }

  private closeStream(): void {
    this.source?.close();
    this.source = null;
  }

  private schedulePoll(ms: number): void {
    if (this.pollTimer !== null) clearInterval(this.pollTimer);
    // fuera de la zona: un temporizador permanente dentro de ella impediría que la aplicación quede estable
    this.zone.runOutsideAngular(() => {
      this.pollTimer = setInterval(() => {
        if (!document.hidden) this.zone.run(() => void this.poll());
      }, ms);
    });
  }

  private async poll(): Promise<void> {
    if (this._connection() === 'live') {
      const results = await Promise.allSettled([this.loadSeries(), this.loadFailures(), this.loadCodes(), this.loadOutages(), this.loadMessages()]);
      this.markResult(results.every((r) => r.status === 'fulfilled'));
      return;
    }
    await this.refreshAll();
  }
}
