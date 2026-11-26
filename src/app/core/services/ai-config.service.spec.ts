import { TestBed } from '@angular/core/testing';
import { AiConfigService } from './ai-config.service';

describe('AiConfigService', () => {
  let service: AiConfigService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AiConfigService]
    });
    service = TestBed.inject(AiConfigService);
  });

  afterEach(() => {
    localStorage.clear();
    (window as any).fetch = (window as any)._originalFetch || window.fetch;
  });

  it('should be created and start without api key by default', () => {
    expect(service).toBeTruthy();
    expect(service.hasApiKey()).toBeFalse();
  });

  describe('API Key Management', () => {
    it('should set, persist in localStorage and retrieve API Key', () => {
      service.setApiKey('AIzaSyTestKey123');
      expect(service.apiKey()).toBe('AIzaSyTestKey123');
      expect(service.hasApiKey()).toBeTrue();
      expect(localStorage.getItem('mi_espacio_gemini_api_key')).toBe('AIzaSyTestKey123');
    });

    it('should remove API Key from service and localStorage', () => {
      service.setApiKey('AIzaSyTestKey123');
      expect(service.hasApiKey()).toBeTrue();

      service.removeApiKey();
      expect(service.apiKey()).toBe('');
      expect(service.hasApiKey()).toBeFalse();
      expect(localStorage.getItem('mi_espacio_gemini_api_key')).toBeNull();
    });
  });

  describe('Gemini Request Handling & Resilience', () => {
    it('should throw NO_API_KEY when generating text without a key', async () => {
      service.removeApiKey();
      await expectAsync(service.generateText('Hola')).toBeRejectedWithError('NO_API_KEY');
    });

    it('should dynamically discover models, excluding deprecated 1.0, 1.5 and gemini-pro', async () => {
      service.setApiKey('AIzaFakeValidKey');

      // Spy on fetch to simulate Google ListModels API and generateContent API
      spyOn(window, 'fetch').and.callFake(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        // 1. Mock ListModels endpoint
        if (url.includes('/models?key=')) {
          return new Response(
            JSON.stringify({
              models: [
                { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
                { name: 'models/gemini-pro', supportedGenerationMethods: ['generateContent'] },
                { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
                { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // 2. Mock generateContent endpoint for the selected model
        if (url.includes(':generateContent')) {
          expect(url).toContain('gemini-2.0-flash');
          expect(url).not.toContain('gemini-1.5-flash');
          expect(url).not.toContain('gemini-pro');

          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: 'Respuesta generada correctamente por Gemini.' }]
                  }
                }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response('Not found', { status: 404 });
      });

      const result = await service.generateText('Resumen');
      expect(result).toBe('Respuesta generada correctamente por Gemini.');
    });

    it('should handle API_NOT_ENABLED error with clear guidance', async () => {
      service.setApiKey('AIzaKeyNoAPIEnabled');

      spyOn(window, 'fetch').and.callFake(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/models?key=')) {
          return new Response(
            JSON.stringify({
              error: {
                message: 'Generative Language API has not been used in project 123456 before or it is disabled.'
              }
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not found', { status: 404 });
      });

      await expectAsync(service.generateText('Test')).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/API_NOT_ENABLED/)
        })
      );
    });
  });
});
