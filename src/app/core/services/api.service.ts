import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../models';
import { API_BASE_URL } from '../config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  /** `localStorage` solo existe en el navegador: en SSR se usa la configuración por defecto del entorno. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private config: ApiConfig = {
    baseUrl: inject(API_BASE_URL),
    apiKey: '',
    authType: 'none',
  };

  constructor() {
    this.loadConfig();
  }

  /** Actualiza la configuración de la API y la persiste en localStorage */
  updateConfig(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.isBrowser) {
      localStorage.setItem('api_config', JSON.stringify(this.config));
    }
  }

  /** Obtiene la configuración actual */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /** GET tipado */
  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.get<T>(`${this.config.baseUrl}${path}`, {
      headers: this.buildHeaders(),
      params: httpParams,
    });
  }

  /** POST tipado */
  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.config.baseUrl}${path}`, body, {
      headers: this.buildHeaders(),
    });
  }

  /** PUT tipado */
  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.config.baseUrl}${path}`, body, {
      headers: this.buildHeaders(),
    });
  }

  /** DELETE tipado */
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.config.baseUrl}${path}`, {
      headers: this.buildHeaders(),
    });
  }

  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (this.config.authType === 'bearer' && this.config.apiKey) {
      headers = headers.set('Authorization', `Bearer ${this.config.apiKey}`);
    } else if (this.config.authType === 'apikey' && this.config.apiKey) {
      headers = headers.set('X-API-Key', this.config.apiKey);
    }

    return headers;
  }

  private buildParams(params?: Record<string, string | number>): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, String(value));
      });
    }
    return httpParams;
  }

  private loadConfig(): void {
    if (!this.isBrowser) return;
    const saved = localStorage.getItem('api_config');
    if (saved) {
      try {
        const parsed: ApiConfig = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      } catch {
        // Si falla el parseo, se mantiene la config por defecto
      }
    }
  }
}
