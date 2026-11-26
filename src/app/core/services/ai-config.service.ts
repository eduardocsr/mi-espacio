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

  /**
   * Ejecuta una solicitud a la API de Google Gemini (gemini-1.5-flash).
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const key = this.apiKey().trim();
    if (!key) {
      throw new Error('NO_API_KEY');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      if (response.status === 400 || response.status === 403 || response.status === 401) {
        throw new Error(`INVALID_API_KEY: ${errMsg}`);
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;
    if (!textPart) {
      throw new Error('EMPTY_RESPONSE');
    }

    return textPart.trim();
  }

  /**
   * Genera un resumen ejecutivo breve de la nota en HTML limpio.
   */
  async summarizeNote(title: string, content: string): Promise<string> {
    const systemPrompt =
      'Eres el asistente editorial de la aplicación "Mi Espacio". Analiza el texto proporcionado y genera un resumen ejecutivo conciso en 2 a 4 viñetas clave. Devuelve exclusivamente fragmentos HTML limpios con <ul> y <li> (puedes usar <strong> para resaltar conceptos), sin etiquetas <html> ni <body> ni comillas de bloque de código markdown.';
    const userPrompt = `Título: "${title}"\n\nContenido:\n${content}`;
    return this.generateText(userPrompt, systemPrompt);
  }

  /**
   * Mejora la redacción, claridad y estilo del contenido.
   */
  async improveWriting(title: string, content: string): Promise<string> {
    const systemPrompt =
      'Eres un editor editorial profesional para "Mi Espacio". Reescribe y pule el texto para maximizar la claridad, coherencia, gramática y elegancia, respetando el tono original del autor. Devuelve directamente el texto formateado en HTML estándar (<p>, <h2>, <h3>, <ul><li>, etc.) sin explicaciones, sin saludos ni delimitadores de código markdown.';
    const userPrompt = `Título: "${title}"\n\nTexto original a mejorar:\n${content}`;
    return this.generateText(userPrompt, systemPrompt);
  }

  /**
   * Extrae un plan de acción concreto (lista de tareas pendientes).
   */
  async extractActionPlan(title: string, content: string): Promise<string[]> {
    const systemPrompt =
      'Eres un especialista en productividad de "Mi Espacio". Analiza la nota y extrae un plan de acción de 3 a 7 tareas concretas y accionables. Devuelve ÚNICAMENTE un arreglo JSON válido de strings con las tareas (por ejemplo: ["Revisar documentación", "Enviar correo a clientes"]). No incluyas nada fuera del arreglo JSON.';
    const userPrompt = `Título: "${title}"\n\nContenido:\n${content}`;
    const raw = await this.generateText(userPrompt, systemPrompt);
    try {
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fallback si no viene en JSON puro: separar por saltos de línea
      return raw
        .split('\n')
        .map(l => l.replace(/^[-*•\d.)\]]\s*/, '').trim())
        .filter(l => l.length > 2);
    }
    return [];
  }

  /**
   * Genera 3 ideas creativas o preguntas reflexivas para profundizar.
   */
  async generateIdeas(title: string, content: string): Promise<string> {
    const systemPrompt =
      'Eres un facilitador de pensamiento creativo para "Mi Espacio". Genera 3 ideas o preguntas estimulantes para profundizar, retar o expandir el tema de la nota. Devuelve únicamente una lista HTML <ul><li>...</li></ul> con las 3 sugerencias.';
    const userPrompt = `Título: "${title}"\n\nContenido de la nota:\n${content}`;
    return this.generateText(userPrompt, systemPrompt);
  }
}
