import { AIService, detectProviderFromKey } from '../../src/ai/AIService';

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('mocked-base64-data'),
  EncodingType: { Base64: 'base64' },
}));

describe('AIService - Integración con IAs (Gemini y OpenAI)', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ask() - Consultas de texto', () => {
    it('debe consultar Gemini correctamente y devolver el texto', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Respuesta simulada de Gemini' }],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.ask('Hola', 'fake-api-key', 'gemini');
      expect(response.text).toBe('Respuesta simulada de Gemini');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1beta/models/gemini-3.5-flash:generateContent?key=fake-api-key'),
        expect.any(Object)
      );
    });

    it('debe respetar el modelo específico solicitado en Gemini sin mutarlo', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Respuesta Pro' }],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.ask('Hola', 'fake-api-key', 'gemini', 'gemini-2.5-pro');
      expect(response.text).toBe('Respuesta Pro');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1beta/models/gemini-2.5-pro:generateContent?key=fake-api-key'),
        expect.any(Object)
      );
    });

    it('debe consultar OpenAI correctamente y devolver el texto', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Respuesta simulada de GPT-4o' },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.ask('Hola', 'fake-api-key', 'openai');
      expect(response.text).toBe('Respuesta simulada de GPT-4o');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openai.com/v1/chat/completions'),
        expect.any(Object)
      );
    });

    it('debe consultar Groq correctamente y devolver el texto', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Respuesta simulada de Groq' },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.ask('Hola', 'fake-api-key', 'groq');
      expect(response.text).toBe('Respuesta simulada de Groq');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.groq.com/openai/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('llama-3.3-70b-versatile'),
        })
      );
    });

    it('debe consultar OpenRouter correctamente y devolver el texto', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Respuesta simulada de OpenRouter' },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.ask('Hola', 'fake-api-key', 'openrouter');
      expect(response.text).toBe('Respuesta simulada de OpenRouter');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('openrouter.ai/api/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('openrouter/free'),
        })
      );
    });

    it('debe respetar el modelo específico solicitado en OpenRouter sin mutarlo', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Respuesta DeepSeek R1' },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.ask('Hola', 'fake-api-key', 'openrouter', 'deepseek/deepseek-r1');
      expect(response.text).toBe('Respuesta DeepSeek R1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('openrouter.ai/api/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('deepseek/deepseek-r1'),
        })
      );
    });

    it('debe capturar errores de la API', async () => {
      const mockErrorResponse = {
        error: { message: 'API Key inválida' },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => mockErrorResponse,
      });

      const response = await AIService.ask('Hola', 'invalid-key', 'gemini');
      expect(response.error).toBe('API Key inválida');
    });
  });

  describe('transcribe() - Transcripción de audio', () => {
    it('debe transcribir con Gemini enviando datos en Base64', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Texto transcrito por Gemini' }],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.transcribe('file:///audio.m4a', 'fake-key', 'gemini');
      expect(response.text).toBe('Texto transcrito por Gemini');
    });

    it('debe transcribir con OpenAI enviando FormData', async () => {
      const mockResponse = {
        text: 'Texto transcrito por Whisper',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.transcribe('file:///audio.m4a', 'fake-key', 'openai');
      expect(response.text).toBe('Texto transcrito por Whisper');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openai.com/v1/audio/transcriptions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-key',
          }),
        })
      );
    });

    it('debe transcribir con Groq enviando FormData', async () => {
      const mockResponse = {
        text: 'Texto transcrito por Groq Whisper',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await AIService.transcribe('file:///audio.m4a', 'fake-key', 'groq');
      expect(response.text).toBe('Texto transcrito por Groq Whisper');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.groq.com/openai/v1/audio/transcriptions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-key',
          }),
        })
      );
    });

    it('debe devolver error al intentar transcribir con OpenRouter', async () => {
      const response = await AIService.transcribe('file:///audio.m4a', 'fake-key', 'openrouter');
      expect(response.error).toContain('OpenRouter no soporta transcripción');
    });
  });

  describe('validateKey() - Diagnósticos y validación', () => {
    it('debe validar Gemini correctamente tras consultar lista de modelos', async () => {
      // Mock GET /models then POST generateContent
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            models: [
              { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'pong' }] } }],
          }),
        });

      const res = await AIService.validateKey('AIzaSyFakeKey1234567890', 'gemini');
      expect(res.success).toBe(true);
      expect(res.detectedModel).toBe('gemini-2.0-flash');
    });

    it('debe generar log de diagnóstico detallado si Gemini rechaza la key', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            code: 400,
            status: 'INVALID_ARGUMENT',
            message: 'API key not valid. Please pass a valid API key.',
          },
        }),
      });

      const res = await AIService.validateKey('AIzaInvalidKey', 'gemini');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Estado HTTP: 400');
      expect(res.error).toContain('INVALID_ARGUMENT');
      expect(res.error).toContain('API key not valid');
    });
  });

  describe('detectProviderFromKey() - Auto-detección de proveedor', () => {
    it('debe detectar Gemini con prefijo AIza', () => {
      expect(detectProviderFromKey('AIzaSyD1234567890abcdef')).toBe('gemini');
    });

    it('debe detectar Groq con prefijo gsk_', () => {
      expect(detectProviderFromKey('gsk_1234567890abcdef')).toBe('groq');
    });

    it('debe detectar OpenRouter con prefijo sk-or-', () => {
      expect(detectProviderFromKey('sk-or-v1-1234567890abcdef')).toBe('openrouter');
    });

    it('debe detectar OpenAI con prefijo sk- o sk-proj-', () => {
      expect(detectProviderFromKey('sk-proj-1234567890abcdef')).toBe('openai');
      expect(detectProviderFromKey('sk-1234567890abcdef')).toBe('openai');
    });

    it('debe devolver null para claves desconocidas o vacías', () => {
      expect(detectProviderFromKey('')).toBeNull();
      expect(detectProviderFromKey('unknown_key_format')).toBeNull();
    });
  });

  describe('listAvailableModels() - Catálogo dinámico de modelos', () => {
    it('debe listar modelos de Gemini filtrando los de generación de contenido', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
            { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      });

      const res = await AIService.listAvailableModels('AIzaFakeKey', 'gemini');
      expect(res.models).toContain('gemini-2.5-flash');
      expect(res.models).toContain('gemini-2.5-pro');
      expect(res.models).not.toContain('text-embedding-004');
      expect(res.recommended).toBe('gemini-2.5-flash');
    });
  });
});
