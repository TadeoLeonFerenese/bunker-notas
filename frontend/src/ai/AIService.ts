export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'openai';

export interface AIResponse {
  text?: string;
  error?: string;
}

export function sanitizeApiKey(key: string): string {
  if (!key) return '';
  return key.replace(/[\u200B-\u200D\uFEFF\s]/g, '').trim();
}

export function maskApiKey(key: string): string {
  const clean = sanitizeApiKey(key);
  if (!clean) return '(Vacía - 0 caracteres)';
  if (clean.length <= 8) return `${clean.substring(0, 2)}...${clean.substring(clean.length - 2)} (${clean.length} caracteres)`;
  return `${clean.substring(0, 6)}...${clean.substring(clean.length - 4)} (${clean.length} caracteres)`;
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
        const rawModel = model && model.trim() ? model.trim() : 'gemini-3.6-flash';
        const modelName = (rawModel === 'gemini-3.5-flash' || rawModel === 'gemini-1.5-flash' || rawModel === 'gemini-2.0-flash' || rawModel === 'gemini-2.5-flash') ? 'gemini-3.6-flash' : rawModel;
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
        
        // If Google rejects or suggests a new model ("Please update your code to use models/..."), extract it dynamically!
        if (!response.ok && data.error?.message) {
          const suggestedMatch = data.error.message.match(/use models\/([a-zA-Z0-9.-]+)/);
          const fallbackModel = suggestedMatch ? suggestedMatch[1] : (modelName === 'gemini-3.6-flash' ? 'gemini-2.5-flash' : 'gemini-3.6-flash');
          
          console.log(`[AIService Gemini Fallback] Retrying with dynamically discovered model ${fallbackModel}...`);
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

  async validateGemini(apiKey: string, requestedModel?: string): Promise<{ success: boolean; error?: string; detectedModel?: string }> {
    const cleanKey = sanitizeApiKey(apiKey);
    const masked = maskApiKey(cleanKey);

    if (!cleanKey) {
      return { success: false, error: '• Error: La API Key ingresada está vacía.' };
    }

    try {
      console.log(`[AIService Gemini Validate] Probing models with key ${masked}...`);
      const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
      const modelsResp = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
      });

      const modelsData = await modelsResp.json();
      console.log(`[AIService Gemini Validate] Models probe status: ${modelsResp.status}`, JSON.stringify(modelsData));

      if (!modelsResp.ok) {
        const httpStatus = modelsResp.status;
        const errObj = modelsData?.error || {};
        const code = errObj.status || errObj.code || `HTTP_${httpStatus}`;
        const msg = errObj.message || (typeof modelsData === 'string' ? modelsData : JSON.stringify(modelsData));

        let hint = 'Revisá la API Key copiada de Google AI Studio.';
        if (code === 'INVALID_ARGUMENT' || msg?.includes('API key not valid')) {
          hint = 'La clave es INVÁLIDA o se copió incompleta. Creá una nueva en https://aistudio.google.com/app/apikey.';
        } else if (code === 'PERMISSION_DENIED' || msg?.includes('permission')) {
          hint = 'La clave no tiene permisos o la API "Generative Language API" no está habilitada en tu proyecto de Google Cloud.';
        } else if (httpStatus === 429 || code === 'RESOURCE_EXHAUSTED') {
          hint = 'Límite de peticiones por minuto superado en Google AI Studio.';
        }

        const diag = 
          `• Estado HTTP: ${httpStatus} (${modelsResp.statusText || 'Error'})\n` +
          `• Código de Error: ${code}\n` +
          `• Key Probada: ${masked}\n` +
          `• Endpoint: generativelanguage.googleapis.com/v1beta/models\n` +
          `• Mensaje Oficial de Google: "${msg}"\n\n` +
          `• Diagnóstico Sugerido: ${hint}`;

        return { success: false, error: diag };
      }

      const rawModels: any[] = modelsData.models || [];
      const supported = rawModels
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));

      console.log(`[AIService Gemini Validate] Supported models found:`, supported);

      let targetModel = requestedModel && supported.includes(requestedModel.trim().replace(/^models\//, ''))
        ? requestedModel.trim().replace(/^models\//, '')
        : '';

      if (!targetModel) {
        targetModel = supported.find(m => m.includes('3.6-flash') || m.includes('3.7-flash')) ||
                      supported.find(m => m.includes('flash')) ||
                      supported.find(m => m.includes('gemini')) ||
                      supported[0] ||
                      'gemini-3.6-flash';
      }

      const testRes = await this.ask('ping', cleanKey, 'gemini', targetModel);
      if (testRes.error) {
        const diag = 
          `• Key Válida, pero falló la generación con modelo '${targetModel}':\n` +
          `• Modelos activos en tu cuenta: ${supported.slice(0, 5).join(', ')}${supported.length > 5 ? '...' : ''}\n` +
          `• Detalle de Error: ${testRes.error}`;
        return { success: false, error: diag };
      }

      return { success: true, detectedModel: targetModel };
    } catch (e: any) {
      console.error('[AIService Gemini Validate Exception]', e);
      const diag = 
        `• Excepción de Red: ${e.message || 'fetch failed'}\n` +
        `• Key Probada: ${masked}\n` +
        `• Diagnóstico Sugerido: Fallo de conexión DNS/TCP en el dispositivo o bloqueo de red.`;
      return { success: false, error: diag };
    }
  },

  async validateGroq(apiKey: string, requestedModel?: string): Promise<{ success: boolean; error?: string; detectedModel?: string }> {
    const cleanKey = sanitizeApiKey(apiKey);
    const masked = maskApiKey(cleanKey);
    const isXAI = cleanKey.startsWith('xai-');

    if (!cleanKey) {
      return { success: false, error: '• Error: La API Key ingresada está vacía.' };
    }

    try {
      const url = isXAI ? 'https://api.x.ai/v1/models' : 'https://api.groq.com/openai/v1/models';
      const modelsResp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Accept': 'application/json',
        },
      });

      const modelsData = await modelsResp.json();
      if (!modelsResp.ok) {
        const httpStatus = modelsResp.status;
        const errObj = modelsData?.error || {};
        const msg = errObj.message || (typeof modelsData === 'string' ? modelsData : JSON.stringify(modelsData));
        const diag = 
          `• Estado HTTP: ${httpStatus} (${modelsResp.statusText || 'Error'})\n` +
          `• Key Probada: ${masked}\n` +
          `• Mensaje de ${isXAI ? 'xAI' : 'Groq'}: "${msg}"\n\n` +
          `• Diagnóstico Sugerido: ${httpStatus === 401 ? 'API Key inválida. Obtené una clave en https://console.groq.com/keys (debe empezar con gsk_).' : 'Error de servicio en Groq.'}`;
        return { success: false, error: diag };
      }

      const rawModels: any[] = modelsData.data || [];
      const supported = rawModels.map(m => m.id);
      let targetModel = requestedModel ? requestedModel.trim() : (isXAI ? 'grok-2-latest' : 'llama-3.3-70b-versatile');
      if (!isXAI && (!targetModel || !supported.includes(targetModel))) {
        targetModel = supported.find(m => m === 'llama-3.3-70b-versatile') ||
                      supported.find(m => m === 'llama-3.1-8b-instant') ||
                      supported.find(m => m.startsWith('llama-3.3')) ||
                      supported[0] ||
                      'llama-3.3-70b-versatile';
      }

      const testRes = await this.ask('ping', cleanKey, 'groq', targetModel);
      if (testRes.error) {
        return { success: false, error: `• Falló test con '${targetModel}':\n• Detalle: ${testRes.error}` };
      }

      return { success: true, detectedModel: targetModel };
    } catch (e: any) {
      return { success: false, error: `• Excepción de Red: ${e.message || 'fetch failed'}\n• Key Probada: ${masked}` };
    }
  },

  async validateOpenRouter(apiKey: string, requestedModel?: string): Promise<{ success: boolean; error?: string; detectedModel?: string }> {
    const cleanKey = sanitizeApiKey(apiKey);
    const masked = maskApiKey(cleanKey);

    if (!cleanKey) {
      return { success: false, error: '• Error: La API Key ingresada está vacía.' };
    }

    try {
      const authUrl = 'https://openrouter.ai/api/v1/auth/key';
      const authResp = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
        },
      });

      const authData = await authResp.json();
      if (!authResp.ok) {
        const httpStatus = authResp.status;
        const msg = authData?.error?.message || JSON.stringify(authData);
        return {
          success: false,
          error: `• Estado HTTP: ${httpStatus}\n• Key Probada: ${masked}\n• Mensaje de OpenRouter: "${msg}"\n\n• Diagnóstico Sugerido: Clave inválida. Obtené una en https://openrouter.ai/keys.`
        };
      }

      const targetModel = requestedModel && requestedModel.trim() ? requestedModel.trim() : 'deepseek/deepseek-r1:free';
      const testRes = await this.ask('ping', cleanKey, 'openrouter', targetModel);
      if (testRes.error) {
        return {
          success: false,
          error: `• Key Válida, pero falló el modelo '${targetModel}':\n• Detalle: ${testRes.error}\n\n• Diagnóstico Sugerido: Asegurate de usar modelos con sufijo ':free' (ej: deepseek/deepseek-r1:free o meta-llama/llama-3.3-70b-instruct:free).`
        };
      }

      return { success: true, detectedModel: targetModel };
    } catch (e: any) {
      return { success: false, error: `• Excepción de Red: ${e.message || 'fetch failed'}\n• Key Probada: ${masked}` };
    }
  },

  async validateOpenAI(apiKey: string, requestedModel?: string): Promise<{ success: boolean; error?: string; detectedModel?: string }> {
    const cleanKey = sanitizeApiKey(apiKey);
    const masked = maskApiKey(cleanKey);
    const targetModel = requestedModel && requestedModel.trim() ? requestedModel.trim() : 'gpt-4o-mini';

    if (!cleanKey) {
      return { success: false, error: '• Error: La API Key ingresada está vacía.' };
    }

    const testRes = await this.ask('ping', cleanKey, 'openai', targetModel);
    if (testRes.error) {
      return {
        success: false,
        error: `• Estado: Error al consultar OpenAI (${targetModel})\n• Key Probada: ${masked}\n• Detalle: ${testRes.error}\n\n• Diagnóstico Sugerido: ${testRes.error.includes('credits') ? 'Tu cuenta de OpenAI tiene $0 de saldo/créditos en billing.' : 'Revisá la API Key o límites en platform.openai.com.'}`
      };
    }

    return { success: true, detectedModel: targetModel };
  },

  async validateKey(apiKey: string, provider: AIProvider, model?: string): Promise<{ success: boolean; error?: string; detectedModel?: string }> {
    if (provider === 'gemini') {
      return this.validateGemini(apiKey, model);
    }
    if (provider === 'groq') {
      return this.validateGroq(apiKey, model);
    }
    if (provider === 'openrouter') {
      return this.validateOpenRouter(apiKey, model);
    }
    return this.validateOpenAI(apiKey, model);
  }
};
