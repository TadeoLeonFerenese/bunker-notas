import { AIService } from '../../src/ai/AIService';

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
        expect.stringContaining('gemini-1.5-flash:generateContent?key=fake-api-key'),
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
  });
});
