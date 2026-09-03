---
name: byok-llm-wrapper
description: >
  Envoltorio resiliente y seguro para integración de LLMs (Bring Your Own Key) con OpenAI, Gemini, Groq y OpenRouter.
  Trigger: Archivos en src/ai/, servicios de IA, o modificaciones de system prompts y parsers de respuesta.
license: MIT
metadata:
  author: bunker-notas
  version: "1.0"
---

# BYOK LLM Wrapper 🧠

Guía y auditor para el subsistema de Asistente de IA (BYOK - Bring Your Own Key) en Bunker Notas, garantizando robustez ante fallos de red, respuestas malformadas y sanitización estricta de credenciales.

## Triggers de Activación
- Archivos en `frontend/src/ai/` (`aiService.ts`, `prompts.ts`, `providers/`).
- Componentes UI que soliciten o configuren API Keys de OpenAI, Google Gemini, Groq u OpenRouter.
- Lógica de parseo de notas generadas por IA.

---

## Reglas Críticas de Robustez

### 1. Sanitización Estricta de API Keys al Copiar/Pegar
- Al recibir una API Key del usuario en la UI, sanitizar inmediatamente eliminando:
  - Caracteres invisibles de ancho cero (Zero-Width Space `\u200B`, BOM `\uFEFF`, `\u200C`, `\u200D`).
  - Espacios en blanco al inicio y final (`trim()`).
  - Saltos de línea accidentales (`\n`, `\r`) que invalidan los headers HTTP de autenticación `Bearer` o `x-goog-api-key`.

### 2. Formato de Salida JSON Estricto y Garantizado
- El `system_prompt` debe instruir taxativamente al modelo a devolver ÚNICAMENTE un objeto JSON válido con la estructura:
  ```json
  {
    "title": "Título sugerido de la nota",
    "content": "Cuerpo formateado de la nota"
  }
  ```
- No permitir que el modelo devuelva explicaciones adicionales fuera del payload JSON.

### 3. Extractor Resiliente por Regex en Caliente
- Ante modelos que envuelvan la respuesta en bloques de código markdown (` ```json ... ``` `) o agreguen texto introductorio, aplicar un extractor seguro por Regex antes de llamar a `JSON.parse()`:
  ```typescript
  export function extractJsonFromResponse(rawText: string): { title: string; content: string } {
    try {
      // 1. Intento parseo directo
      return JSON.parse(rawText.trim());
    } catch {
      // 2. Extracción de bloque JSON por Regex
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No se pudo extraer una estructura JSON válida de la respuesta del modelo.");
    }
  }
  ```

### 4. Resiliencia ante Cambios y Deprecaciones de Endpoints
- Manejar adecuadamente los códigos de error HTTP `400 Bad Request` / `404 Not Found` por nombres de modelos deprecados (ej. migraciones de Gemini 1.5 a 2.0 / 2.5), informando al usuario de forma clara en la UI si necesita actualizar el identificador del modelo en la configuración.

### 5. Privacidad y Zero-Knowledge Absoluta
- **NUNCA** enviar en el prompt datos del sistema, tokens de Google Drive, PINs o salts.
- Si el usuario usa la IA sobre una nota existente, procesar únicamente el texto en claro aprobado explícitamente por el usuario.
