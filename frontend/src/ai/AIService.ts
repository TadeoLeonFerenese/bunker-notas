export type AIProvider = 'gemini' | 'openai';

export interface AIResponse {
  text?: string;
  error?: string;
}

export const AIService = {
  async getAudioBase64(uri: string): Promise<string> {
    try {
      if (uri.startsWith('http') || uri.startsWith('blob:') || uri.startsWith('data:')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const FileSystem = require('expo-file-system/legacy');
        return await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (e: any) {
      console.error('Error encoding audio to base64:', e);
      throw new Error('No se pudo codificar el audio: ' + e.message);
    }
  },

  async transcribeGemini(audioUri: string, apiKey: string): Promise<AIResponse> {
    try {
      const base64Data = await this.getAudioBase64(audioUri);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/mp4', // m4a is MPEG-4 audio
                  data: base64Data
                }
              },
              {
                text: 'Transcribe exactamente lo que se dice en este audio en español. Devuelve únicamente la transcripción literal sin comentarios, explicaciones, ni etiquetas.'
              }
            ]
          }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.error?.message || 'Error en Gemini API' };
      }

      return { text: data.candidates[0]?.content?.parts[0]?.text?.trim() || '' };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  async transcribeOpenAI(audioUri: string, apiKey: string): Promise<AIResponse> {
    try {
      const formData = new FormData();
      
      // On web/native we append the file differently
      if (audioUri.startsWith('http') || audioUri.startsWith('blob:')) {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('file', blob, 'audio.m4a');
      } else {
        // Native React Native format
        formData.append('file', {
          uri: audioUri,
          name: 'audio.m4a',
          type: 'audio/m4a'
        } as any);
      }
      
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');

      const url = 'https://api.openai.com/v1/audio/transcriptions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          // Let browser/fetch set Content-Type header with the boundary
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.error?.message || 'Error en OpenAI API' };
      }

      return { text: data.text?.trim() || '' };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  async transcribe(audioUri: string, apiKey: string, provider: AIProvider): Promise<AIResponse> {
    if (provider === 'gemini') {
      return this.transcribeGemini(audioUri, apiKey);
    }
    return this.transcribeOpenAI(audioUri, apiKey);
  },

  async ask(prompt: string, apiKey: string, provider: AIProvider): Promise<AIResponse> {
    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        console.log(`[AIService Gemini Request] Sending ask prompt to Gemini...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        const data = await response.json();
        console.log(`[AIService Gemini Response] Status: ${response.status}`, JSON.stringify(data));
        
        if (!response.ok) {
          return { error: data.error?.message || `HTTP ${response.status}: Error en Gemini API` };
        }

        return { text: data.candidates[0]?.content?.parts[0]?.text || '' };
      } else {
        const url = 'https://api.openai.com/v1/chat/completions';
        console.log(`[AIService OpenAI Request] Sending ask prompt to OpenAI...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const data = await response.json();
        console.log(`[AIService OpenAI Response] Status: ${response.status}`, JSON.stringify(data));

        if (!response.ok) {
          return { error: data.error?.message || `HTTP ${response.status}: Error en OpenAI API` };
        }

        return { text: data.choices[0]?.message?.content || '' };
      }
    } catch (e: any) {
      console.error('[AIService Request Exception]', e);
      return { error: e.message || 'Error de red / excepción de fetch' };
    }
  },

  async validateKey(apiKey: string, provider: AIProvider): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.ask('ping', apiKey, provider);
      if (res.error) {
        return { success: false, error: res.error };
      }
      if (res.text && res.text.trim().length > 0) {
        return { success: true };
      }
      return { success: false, error: 'Respuesta vacía del servicio' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error de red inesperado' };
    }
  }
};
