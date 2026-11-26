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

  private detectedEndpoint: string | null = null;

  hasApiKey(): boolean {
    return !!this.apiKey();
  }

  /**
   * Ejecuta una solicitud a la API de Google Gemini con detección y fallback automático
   * entre modelos compatibles (gemini-1.5-flash-latest, v1 gemini-1.5-flash, gemini-2.0-flash, gemini-pro).
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const key = this.apiKey().trim();
    if (!key) {
      throw new Error('NO_API_KEY');
    }

    const promptText = systemInstruction
      ? `${systemInstruction}\n\n[Contenido a procesar]:\n${prompt}`
      : prompt;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    // Endpoints candidatos en orden de preferencia y compatibilidad
    const candidateUrls = this.detectedEndpoint
      ? [this.detectedEndpoint]
      : [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
          `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${key}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`
        ];

    let lastError: Error | null = null;

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const data = await response.json();
          const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textPart) {
            // Guardamos el endpoint funcional para optimizar llamadas siguientes
            this.detectedEndpoint = url;
            return textPart.trim();
          }
        }

        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        // Si es un error de clave inválida (API key expired / invalid / unauthorized), detener fallback
        if (
          (response.status === 400 || response.status === 403 || response.status === 401) &&
          (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('api_key'))
        ) {
          throw new Error(`INVALID_API_KEY: ${errMsg}`);
        }

        lastError = new Error(errMsg);
      } catch (e: any) {
        if (e.message?.startsWith('INVALID_API_KEY')) {
          throw e;
        }
        lastError = e;
      }
    }

    throw lastError || new Error('No se pudo obtener respuesta de los modelos de Gemini.');
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
