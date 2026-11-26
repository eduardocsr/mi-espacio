import { Injectable, signal } from '@angular/core';

const GEMINI_API_KEY_STORAGE = 'mi_espacio_gemini_api_key';

@Injectable({
  providedIn: 'root'
})
export class AiConfigService {
  readonly apiKey = signal<string>('');
  private detectedEndpoint: string | null = null;

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
    this.detectedEndpoint = null;
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
    this.detectedEndpoint = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  }

  hasApiKey(): boolean {
    return !!this.apiKey();
  }

  /**
   * Ejecuta una solicitud a la API de Google Gemini (gemini-3.5-flash-lite) con detección inteligente
   * de modelos habilitados para la clave ingresada y fallback ordenado.
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const key = this.apiKey().trim();
    if (!key) {
      throw new Error('NO_API_KEY');
    }

    // 1. Descubrimiento dinámico de modelos habilitados para esta API Key
    if (!this.detectedEndpoint) {
      try {
        const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (listResp.ok) {
          const listData = await listResp.json();
          const models: Array<{ name: string; supportedGenerationMethods?: string[] }> = listData.models || [];
          const contentModels = models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
          // Excluir estrictamente modelos obsoletos 1.0, 1.5 y gemini-pro retirados por Google
          const validModels = contentModels.filter(
            m => !m.name.includes('1.0') && !m.name.includes('1.5') && !m.name.includes('gemini-pro')
          );

          if (validModels.length > 0) {
            const preferred =
              validModels.find(m => m.name.includes('gemini-3.5-flash-lite')) ||
              validModels.find(m => m.name.includes('3.5-flash')) ||
              validModels.find(m => m.name.includes('flash-lite')) ||
              validModels[0];

            if (preferred) {
              const modelPath = preferred.name.replace(/^models\//, '');
              this.detectedEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:generateContent?key=${key}`;
            }
          }
        } else {
          const errData = await listResp.json().catch(() => null);
          const errMsg = errData?.error?.message || '';
          if (errMsg.includes('has not been used in project') || errMsg.includes('disabled')) {
            throw new Error('API_NOT_ENABLED: La "Generative Language API" no está habilitada en tu proyecto de Google Cloud. Por favor genera una clave gratuita directa en https://aistudio.google.com/app/apikey');
          }
          if (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('api_key')) {
            throw new Error(`INVALID_API_KEY: ${errMsg}`);
          }
        }
      } catch (listErr: any) {
        if (
          listErr.message?.startsWith('API_NOT_ENABLED') ||
          listErr.message?.startsWith('INVALID_API_KEY')
        ) {
          throw listErr;
        }
      }
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

    // Endpoints candidatos configurados estrictamente con gemini-3.5-flash-lite
    const candidateUrls = this.detectedEndpoint
      ? [this.detectedEndpoint]
      : [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
          `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash-lite:generateContent?key=${key}`
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
            this.detectedEndpoint = url;
            return textPart.trim();
          }
        }

        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (
          (response.status === 400 || response.status === 403 || response.status === 401) &&
          (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('api_key'))
        ) {
          throw new Error(`INVALID_API_KEY: ${errMsg}`);
        }

        lastError = new Error(errMsg);
      } catch (e: any) {
        if (e.message?.startsWith('INVALID_API_KEY') || e.message?.startsWith('API_NOT_ENABLED')) {
          throw e;
        }
        lastError = e;
      }
    }

    // Si fallaron todos los endpoints candidatos, resetear detectedEndpoint para refrescar en el siguiente intento
    this.detectedEndpoint = null;

    if (lastError && lastError.message.includes('is not found for API version')) {
      throw new Error('API_NOT_ENABLED: Tu clave de API no tiene habilitada la Generative Language API en Google Cloud. Para usar Gemini gratis, obtén una clave directa en https://aistudio.google.com/app/apikey');
    }

    throw lastError || new Error('No se pudo obtener respuesta de los modelos de Gemini.');
  }

  /**
   * Limpia delimitadores de bloques markdown (```html ... ```) devueltos por el modelo.
   */
  private cleanHtmlOutput(raw: string): string {
    return raw
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  /**
   * Genera un resumen ejecutivo breve de la nota en HTML limpio.
   */
  async summarizeNote(title: string, content: string): Promise<string> {
    const systemPrompt =
      'Eres el asistente editorial de la aplicación "Mi Espacio". Analiza el texto proporcionado y genera un resumen ejecutivo conciso en 2 a 4 viñetas clave. Devuelve exclusivamente fragmentos HTML limpios con <ul> y <li> (puedes usar <strong> para resaltar conceptos), sin etiquetas <html> ni <body> ni comillas de bloque de código markdown.';
    const userPrompt = `Título: "${title}"\n\nContenido:\n${content}`;
    const raw = await this.generateText(userPrompt, systemPrompt);
    return this.cleanHtmlOutput(raw);
  }

  /**
   * Mejora la redacción, claridad y estilo del contenido.
   */
  async improveWriting(title: string, content: string): Promise<string> {
    const systemPrompt =
      'Eres un editor editorial profesional para "Mi Espacio". Reescribe y pule el texto para maximizar la claridad, coherencia, gramática y elegancia, respetando el tono original del autor. Devuelve directamente el texto formateado en HTML estándar (<p>, <h2>, <h3>, <ul><li>, etc.) sin explicaciones, sin saludos ni delimitadores de código markdown.';
    const userPrompt = `Título: "${title}"\n\nTexto original a mejorar:\n${content}`;
    const raw = await this.generateText(userPrompt, systemPrompt);
    return this.cleanHtmlOutput(raw);
  }

  /**
   * Analiza un apunte desordenado, lluvia de ideas o borrador caótico y lo estructura impecablemente:
   * crea títulos de sección (h2, h3), párrafos limpios, viñetas de puntos clave y checklist de tareas.
   */
  async structureMessyNote(title: string, content: string): Promise<string> {
    const systemPrompt = `Eres un arquitecto de información y editor editorial de élite para la aplicación "Mi Espacio".
Tu misión es transformar notas desordenadas, transcripciones caóticas, notas rápidas de reunión o lluvias de ideas en un documento perfectamente estructurado, visualmente atractivo y fácil de leer.

Reglas de estructuración:
1. Extrae y agrupa las ideas afines en secciones temáticas con jerarquía clara.
2. Utiliza <h2> para los títulos de cada sección (por ejemplo: "Contexto y Objetivos", "Puntos Principales", "Decisiones Tomadas", "Tareas y Pendientes", "Próximos Pasos").
3. Utiliza <h3> para subsecciones si el contenido lo requiere.
4. Redacta explicaciones en párrafos <p> fluidos, claros y bien puntuados.
5. Emplea listas con viñetas (<ul><li>...</li></ul>) para listar ideas, detalles o acuerdos.
6. Si detectas compromisos, acciones o tareas por realizar en el texto desordenado, agrúpalos bajo una sección <h2>Tareas y Pendientes</h2> utilizando el formato de lista de verificación de Tiptap:
   <ul data-type="taskList">
     <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Descripción concreta de la acción</p></div></li>
   </ul>
7. Conserva todos los datos, nombres, fechas, cifras e información relevante presente en el texto original; no inventes datos inexistentes.
8. Devuelve exclusivamente fragmentos HTML válidos y limpios (<p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, <ul data-type="taskList">).
9. NO incluyas <html>, <head>, <body>, ni bloques de código markdown como \`\`\`html.`;

    const userPrompt = `Título actual: "${title}"\n\nContenido desordenado a transformar y estructurar:\n${content}`;
    const raw = await this.generateText(userPrompt, systemPrompt);
    return this.cleanHtmlOutput(raw);
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
