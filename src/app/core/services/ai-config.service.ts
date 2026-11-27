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
      'Eres un editor editorial profesional para "Mi Espacio" (estilo Notion editorial). Reescribe y pule el texto para maximizar la claridad, coherencia, gramática y elegancia, respetando el tono original del autor. Si el texto incluye tablas o datos estructurados, mantén y optimiza su formato en <table> o listas según corresponda. Devuelve directamente el texto formateado en HTML estándar (<p>, <h2>, <h3>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <code>, <ul><li>, etc.) sin explicaciones, sin saludos ni delimitadores de código markdown.';
    const userPrompt = `Título: "${title}"\n\nTexto original a mejorar:\n${content}`;
    const raw = await this.generateText(userPrompt, systemPrompt);
    return this.cleanHtmlOutput(raw);
  }

  /**
   * Analiza un apunte desordenado, lluvia de ideas, borrador caótico o datos crudos y lo estructura impecablemente:
   * detecta automáticamente si la información es tabular (roles/códigos, credenciales, matrices) para crear tablas estilo Notion
   * o si es narrativa para organizar títulos de sección (h2, h3), párrafos limpios, viñetas y tareas.
   */
  async structureMessyNote(title: string, content: string): Promise<string> {
    const systemPrompt = `Eres un arquitecto de información y editor editorial de élite para la aplicación "Mi Espacio" (diseñada con la sofisticación visual y estructural de Notion y Obsidian).
Tu misión es transformar notas desordenadas, transcripciones caóticas, datos crudos, listas de roles y códigos, o lluvias de ideas en un documento perfectamente estructurado, visualmente atractivo, profesional y fácil de leer.

Reglas clave de estructuración inteligente:

1. DETECCIÓN AUTOMÁTICA DE DATOS TABULARES / CLAVE-VALOR (Estilo Notion):
   - Si el contenido proporcionado consiste en datos tabulares, columnas separadas por tabulaciones, espacios o saltos de línea (por ejemplo: encabezados como "Perfil / Rol" y "Usuario / Código", roles con identificadores, credenciales, usuarios del sistema, inventarios, catálogos o matrices comparativas):
     DEBES CONSTRUIR OBLIGATORIAMENTE UNA TABLA HTML SEMÁNTICA:
     <table>
       <thead>
         <tr>
           <th>Encabezado 1</th>
           <th>Encabezado 2</th>
         </tr>
       </thead>
       <tbody>
         <tr>
           <td>Nombre del Rol o Entidad</td>
           <td><code>CODIGO_IDENTIFICADOR</code></td>
         </tr>
       </tbody>
     </table>
   - IDENTIFICADORES TÉCNICOS: En las celdas de códigos de usuario, nombres técnicos de sistema, identificadores, números de serie o credenciales (ej. ADMIN_SISGOE_1_3050, 45454545, SISGOE_JODPE_PUERTO_INCA), envuelve SIEMPRE cada código dentro de etiquetas <code>...</code> para que se visualicen como tokens técnicos destacados con estilo Notion.
   - AGRUPACIÓN INTELIGENTE DE FILAS: Si un perfil, rol o categoría posee múltiples usuarios o códigos subordinados (por ejemplo, "ENCUESTAS" con varios analistas/supervisores, o "PERFIL GOECOR" con supervisor y coordinador), colócalos dentro de la misma fila correspondiente, asignando cada código a su propia etiqueta <code>...</code> en párrafos separados (<p><code>CODIGO_1</code></p><p><code>CODIGO_2</code></p>).
   - LIMPIEZA DE ETIQUETAS: Presenta los nombres de roles de forma limpia, clara y legible.

2. CONTENIDO NARRATIVO, REUNIONES O PROYECTOS:
   - Si el contenido es descriptivo o una mezcla de texto y datos:
     a) Extrae y agrupa las ideas en secciones temáticas con jerarquía clara utilizando <h2> para títulos principales y <h3> para subsecciones.
     b) Redacta párrafos <p> fluidos, profesionales y bien redactados.
     c) Utiliza listas con viñetas (<ul><li>...</li></ul>) para enumerar puntos clave, detalles o notas secundarias.
     d) Si hay datos relacionales dentro del texto narrativo, integra una <table> dentro de la sección correspondiente.

3. LISTA DE TAREAS Y ACCIONES PENDIENTES:
   - Si detectas compromisos o tareas a realizar, agrúpalos bajo una sección <h2>Tareas y Pendientes</h2> utilizando el formato de checklist de Tiptap:
     <ul data-type="taskList">
       <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Acción concreta a realizar</p></div></li>
     </ul>

4. FIDELIDAD TOTAL DE LA INFORMACIÓN:
   - Conserva absolutamente todos los nombres, códigos, cifras, fechas e información del texto original; no descartes ningún dato ni inventes información no presente en la nota.

5. FORMATO DE SALIDA ESTRICTO:
   - Devuelve EXCLUSIVAMENTE fragmentos HTML limpios y válidos (<table>, <thead>, <tbody>, <tr>, <th>, <td>, <code>, <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, <mark>, <ul data-type="taskList">).
   - NO incluyas <html>, <head>, <body>, ni bloques de código envolventes markdown como \`\`\`html.`;

    const userPrompt = `Título actual del apunte: "${title}"\n\nContenido desordenado a transformar y estructurar:\n${content}`;
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
