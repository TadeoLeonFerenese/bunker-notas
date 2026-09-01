export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'openai';

export interface AIResponse {
  text?: string;
  error?: string;
}

export const SYSTEM_INSTRUCTION = `Sos un asistente de notas preciso y directo. 
REGLAS ESTRICTAS E INVIOLABLES:
1. Generá ÚNICAMENTE el contenido solicitado por el usuario para la nota.
2. NO incluyas saludos ("Hola", "Por supuesto"), NO incluyas introducciones ("Aquí tienes tu nota:"), NO incluyas comentarios de cierre ("Espero que te sirva") ni explicaciones metatextuales.
3. Si el usuario te pide redactar, resumir, traducir o estructurar un texto, responde EXCLUSIVAMENTE con el resultado final sin agregados.
4. Cumplí al pie de la letra lo solicitado sin inventar información fuera de contexto.`;

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
      let modelName = 'gemini-2.0-flash';
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
      
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim(),
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

      let data = await response.json();
      if (!response.ok && data.error?.message && (data.error.message.includes('not found') || data.error.message.includes('not supported'))) {
        modelName = 'gemini-1.5-flash';
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
        const fallbackResp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim(),
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/mp4',
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
        if (fallbackResp.ok) {
          response = fallbackResp;
          data = await fallbackResp.json();
        }
      }

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
          'Authorization': `Bearer ${apiKey.trim()}`,
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

  async transcribeGroq(audioUri: string, apiKey: string): Promise<AIResponse> {
    try {
      if (apiKey.trim().startsWith('xai-')) {
        return { error: 'xAI Grok no soporta transcripción de audio. Para notas de voz usá Groq (gsk_...), Gemini o OpenAI.' };
      }

      const formData = new FormData();
      if (audioUri.startsWith('http') || audioUri.startsWith('blob:')) {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('file', blob, 'audio.m4a');
      } else {
        formData.append('file', {
          uri: audioUri,
          name: 'audio.m4a',
          type: 'audio/m4a'
        } as any);
      }
      
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'es');

      const url = 'https://api.groq.com/openai/v1/audio/transcriptions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.error?.message || 'Error en Groq API' };
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
    if (provider === 'groq') {
      return this.transcribeGroq(audioUri, apiKey);
    }
    if (provider === 'openrouter') {
      return { error: 'OpenRouter no soporta transcripción directa de audio. Por favor usá Groq o Gemini para notas de voz.' };
    }
    return this.transcribeOpenAI(audioUri, apiKey);
  },

  async ask(prompt: string, apiKey: string, provider: AIProvider, model?: string): Promise<AIResponse> {
    try {
      if (provider === 'gemini') {
        const rawModel = model && model.trim() ? model.trim() : 'gemini-2.0-flash';
        const modelName = rawModel === 'gemini-3.5-flash' ? 'gemini-2.0-flash' : rawModel;
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
        console.log(`[AIService Gemini Request] Sending ask prompt to Gemini model ${modelName}...`);
        let response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim(),
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        let data = await response.json();
        console.log(`[AIService Gemini Response] Status: ${response.status}`, JSON.stringify(data));
        
        // If model is not found or not supported on this key/version, try fallback to gemini-2.5-flash or gemini-2.0-flash
        if (!response.ok && data.error?.message && (data.error.message.includes('not found') || data.error.message.includes('not supported'))) {
          const fallbackModel = modelName === 'gemini-2.0-flash' ? 'gemini-2.5-flash' : 'gemini-2.0-flash';
          console.log(`[AIService Gemini Fallback] Retrying with ${fallbackModel}...`);
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey.trim()}`;
          const fallbackResp = await fetch(fallbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey.trim(),
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
              },
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });
          const fallbackData = await fallbackResp.json();
          if (fallbackResp.ok) {
            response = fallbackResp;
            data = fallbackData;
          }
        }

        if (!response.ok) {
          return { error: data.error?.message || data.message || `HTTP ${response.status}: Error en Gemini API` };
        }

        return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
      } else if (provider === 'openai') {
        const url = 'https://api.openai.com/v1/chat/completions';
        const modelName = model && model.trim() ? model.trim() : 'gpt-4o-mini';
        console.log(`[AIService OpenAI Request] Sending ask prompt to OpenAI model ${modelName}...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: prompt }
            ],
          }),
        });

        const data = await response.json();
        console.log(`[AIService OpenAI Response] Status: ${response.status}`, JSON.stringify(data));

        if (!response.ok) {
          return { error: data.error?.message || data.message || `HTTP ${response.status}: Error en OpenAI API` };
        }

        return { text: data.choices?.[0]?.message?.content || '' };
      } else if (provider === 'groq') {
        const isXAI = apiKey.trim().startsWith('xai-');
        const url = isXAI 
          ? 'https://api.x.ai/v1/chat/completions' 
          : 'https://api.groq.com/openai/v1/chat/completions';
        
        let defaultModel = isXAI ? 'grok-2-latest' : 'llama-3.3-70b-versatile';
        let modelName = model && model.trim() ? model.trim() : defaultModel;
        if (isXAI && (modelName.startsWith('llama') || modelName === 'llama-3.3-70b-versatile' || modelName === 'llama-3.1-8b-instant')) {
          modelName = 'grok-2-latest';
        } else if (!isXAI && (modelName === 'llama-3.1-8b-instant' || modelName.startsWith('grok'))) {
          modelName = 'llama-3.3-70b-versatile';
        }

        console.log(`[AIService ${isXAI ? 'xAI Grok' : 'Groq'} Request] Sending ask prompt to model ${modelName}...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: prompt }
            ],
          }),
        });

        const data = await response.json();
        console.log(`[AIService ${isXAI ? 'xAI Grok' : 'Groq'} Response] Status: ${response.status}`, JSON.stringify(data));

        if (!response.ok) {
          return { error: data.error?.message || data.message || `HTTP ${response.status}: Error en ${isXAI ? 'xAI Grok' : 'Groq'} API` };
        }

        return { text: data.choices?.[0]?.message?.content || '' };
      } else {
        // openrouter
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const rawModel = model && model.trim() ? model.trim() : 'deepseek/deepseek-r1:free';
        const modelName = (rawModel === 'command-r' || rawModel === 'gpt-4o-mini') ? 'deepseek/deepseek-r1:free' : rawModel;
        console.log(`[AIService OpenRouter Request] Sending ask prompt to OpenRouter model ${modelName}...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
            'HTTP-Referer': 'https://bunker-notas.app',
            'X-Title': 'Bunker Notas',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: prompt }
            ],
          }),
        });

        const data = await response.json();
        console.log(`[AIService OpenRouter Response] Status: ${response.status}`, JSON.stringify(data));

        if (!response.ok) {
          return { error: data.error?.message || data.message || (typeof data === 'string' ? data : JSON.stringify(data)) || `HTTP ${response.status}: Error en OpenRouter API` };
        }

        return { text: data.choices?.[0]?.message?.content || '' };
      }
    } catch (e: any) {
      console.error('[AIService Request Exception]', e);
      return { error: e.message || 'Error de red / excepción de fetch' };
    }
  },

  async validateKey(apiKey: string, provider: AIProvider, model?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.ask('ping', apiKey, provider, model);
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
