---
name: gemini-model-router
description: >
  Enrutador y optimizador de modelos Gemini (3.1 a 3.8 con niveles Low, Medium y High) para balancear profundidad de razonamiento vs. ahorro estricto de tokens.
  Trigger: Evaluación de complejidad de tareas, planificación arquitectónica, refactorizaciones pesadas, o al despachar subagentes.
license: MIT
metadata:
  author: bunker-notas
  version: "1.0"
---

# Gemini Model Router & Token Optimizer 🧠⚡

Esta skill define la estrategia de **enrutamiento inteligente de modelos** y niveles de razonamiento (*Thinking Budget: Low, Medium, High*) para maximizar la velocidad, garantizar la solidez técnica y **minimizar el consumo innecesario de tokens**.

## Triggers de Activación
- Al iniciar cualquier tarea o responder una solicitud del usuario.
- Antes de despachar subagentes mediante `invoke_subagent`.
- Al planificar fases de arquitectura, auditorías de seguridad o refactors.

---

## Matriz de Decisión: Complejidad vs. Nivel de Razonamiento

| Nivel de Pensamiento / Modelo | Casos de Uso Típicos | Ratio de Tokens / Velocidad |
| :--- | :--- | :--- |
| **LOW (Flash-Lite / Flash Low)** | Búsquedas de archivos, lectura de docs, formato Markdown, revisión de variables de entorno, scripts auxiliares. | **Ultra Ahorro:** ~80% menos tokens, respuesta instantánea. |
| **MEDIUM (Flash Medium)** | Escritura de componentes UI, tests unitarios en Jest, maquetado con Tailwind/NativeWind, bugs de interfaz estándar. | **Balance Ideal:** Consumo moderado con alta fidelidad de código. |
| **HIGH (Flash High / Pro)** | Criptografía AES-256 / PBKDF2, Zero-Knowledge, esquemas y migraciones de WatermelonDB, flujos OAuth PKCE, auditorías de Google Play Store. | **Máximo Razonamiento:** Profundidad arquitectónica para decisiones críticas. |

---

## Reglas de Comportamiento del Agente

### 1. Sugerencia Proactiva en Chat (UI Principal)
- **Ahorro de Tokens:** Si el usuario tiene seleccionado `High` o `Pro` pero la tarea es meramente mecánica (ej. formatear un archivo, renombrar variables o responder una duda rápida), sugerir:
  > *"💡 Tip de Tokens: Para esta tarea sencilla podés cambiar a **Gemini Flash (Low/Medium)** y ahorrar tokens y latencia."*
- **Garantía de Calidad:** Si el usuario tiene seleccionado `Low` o `Flash-Lite` para una tarea que involucra seguridad criptográfica o concurrencia de base de datos, advertir:
  > *"⚠️ Complejidad Alta: Para este cambio criptográfico/arquitectónico te recomiendo subir a **Gemini Flash (High)** o **Gemini Pro** para garantizar cero errores."*

### 2. Enrutamiento Automático en Subagentes (`invoke_subagent`)
Al crear subagentes de soporte, asignar el parámetro `Model` programáticamente sin consumir tokens de razonamiento profundo innecesarios:
- `flash_lite`: Para agentes de búsqueda en base de código, lectura de archivos o exploración simple.
- `flash`: Para agentes ejecutores de pruebas unitarias o generación de código estándar.
- `pro`: Únicamente para agentes de revisión adversarial (`judgment-day`), diseño arquitectónico o auditoría de seguridad.
