import { Injectable, signal } from '@angular/core';

const GEMINI_API_KEY_STORAGE = 'mi_espacio_gemini_api_key';

@Injectable({
  providedIn: 'root'
})
export class AiConfigService {
  readonly apiKey = signal<string>('');

  constructor() {
    this.loadApiKey();
  }

  private loadApiKey(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(GEMINI_API_KEY_STORAGE);
      if (stored) {
        this.apiKey.set(stored.trim());
      }
    } catch (e) {
      console.warn('No se pudo leer la API Key de Gemini desde localStorage:', e);
    }
  }

  setApiKey(key: string): void {
    const trimmed = key.trim();
    this.apiKey.set(trimmed);
    if (typeof window !== 'undefined') {
      try {
        if (trimmed) {
          localStorage.setItem(GEMINI_API_KEY_STORAGE, trimmed);
        } else {
          localStorage.removeItem(GEMINI_API_KEY_STORAGE);
        }
      } catch (e) {
        console.error('Error al persistir la API Key de Gemini en localStorage:', e);
      }
    }
  }

  removeApiKey(): void {
    this.apiKey.set('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  }

  hasApiKey(): boolean {
    return !!this.apiKey();
  }
}
