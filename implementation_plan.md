# Plan de Implementación: Rediseño de Autenticación (Estilo Banco Galicia) y Grabación de Audio

Este plan maestro establece la evolución arquitectónica y visual de **Bunker Notas**. Por un lado, aborda la incorporación de notas de audio nativas y grillas responsivas. Por otro, introduce un rediseño completo de la experiencia de validación de PIN y Biometría, inspirándose en la fluidez y ergonomía de la aplicación móvil de **Banco Galicia**.

## 🚨 User Review Required (Requiere tu revisión)

### Rediseño de Autenticación en Cascada
Para lograr una experiencia premium estilo bancario, el layout de `LoginScreen.tsx` y el `PinModal` en `App.tsx` adoptará un flujo de **Cascada Vertical Fluida (Waterfall Stack)**.
En lugar de forzar el input de PIN y el botón biométrico en una fila horizontal (`flexDirection: 'row'`) que puede apretarse en pantallas chicas, organizaremos los elementos de arriba hacia abajo con prioridades claras y espaciados proporcionales al alto de la pantalla.

### Tradeoffs y Alternativas para el Input de PIN (Responsive)
El uso de un solo `TextInput` con `letterSpacing: 16` suele desbordarse o descentrarse en Android cuando cambia la densidad de pantalla (DPI). Te propongo dos alternativas para que elijamos:

*   **Alternativa A (PIN Boxes Individuales - Recomendado):** Renderizar 4 a 6 cajitas visuales independientes (`View`) que reflejan cada dígito ingresado, respaldadas por un `TextInput` invisible superpuesto. 
    *   *Pro:* Estética idéntica a cajeros automáticos y apps bancarias top; centrado perfecto y responsive garantizado.
    *   *Contra:* Ligeramente más complejo de maquetar.
*   **Alternativa B (TextInput Único Escalonado):** Un input centrado con fuente dinámica (`useWindowDimensions`) y sin `letterSpacing` extremo, usando caracteres de viñeta grandes (`•`).
    *   *Pro:* Simplicidad de implementación.
    *   *Contra:* Menor impacto visual ("WOW factor").

## ❓ Open Questions (Preguntas Abiertas)

> [!WARNING]
> **Tanke, revisá estas consultas y confirmame antes de arrancar con el código:**
> 1. Para el PIN, ¿vamos de cabeza con la **Alternativa A (Cajitas visuales independientes)** para que quede 100% premium estilo Galicia?
> 2. ¿Mantenemos la regla de que el botón de biometría aparezca debajo del PIN como botón principal en cascada, o preferís que esté flotando en la parte inferior de la pantalla?
> 3. Confirmo que las grillas del Dashboard pasen a 3 o 4 columnas en tablets. ¿Te parece bien?

## 🛠️ Proposed Changes (Cambios Propuestos)

### Dependencies
*   Instalar `expo-av` usando `npm install expo-av` (para soporte de audios).

### 1. Pantalla de Login Minimalista en Cascada
#### [MODIFY] `frontend/src/screens/LoginScreen.tsx`
*   Refactorizar el contenedor del formulario hacia un layout en cascada: Título -> Subtítulo/Hint -> Contenedor de PIN -> Botón Biométrico -> Botón de Validación.
*   Implementar el componente visual de PIN (Cajas visuales) adaptable al ancho de la pantalla (`maxWidth: 360`).
*   Asegurar que `KeyboardAvoidingView` y `ScrollView` manejen el padding dinámico en iOS y Android.

### 2. Modal de Desbloqueo de Notas (PinModal)
#### [MODIFY] `frontend/App.tsx`
*   Aplicar el mismo rediseño en cascada al `pinModalVisible`.
*   Reemplazar el input horizontal por el nuevo diseño responsivo de PIN, asegurando que al tocar una nota segura el teclado no tape los botones de acción.

### 3. Grabación de Audio y Reproducción (MVP)
#### [MODIFY] `frontend/App.tsx`
*   Añadir botón de grabación 🎤 en el modal de creación.
*   Implementar reproductor visual de notas de voz en el modal de lectura con `Audio.Sound`.

### 4. Dashboard Responsivo
#### [MODIFY] `frontend/App.tsx`
*   Ajustar el cálculo de columnas de la grilla según el ancho del dispositivo: `width > 768 ? 3 : width > 1024 ? 4 : 2`.

### 5. Tests (TDD Mandatory)
#### [MODIFY] `frontend/__tests__/auth/BiometricLogin.test.tsx`
*   Adaptar los selectores de los tests de integración al nuevo layout en cascada (verificando que existan los contenedores de dígitos y botones biométricos).

## 🧪 Verification Plan

### Automated Tests
*   Ejecutar `npm test` para corroborar que la validación de PIN (4 a 6 dígitos), el fallback biométrico y el almacenamiento Zero-Knowledge pasen exitosamente.

### Manual Verification
*   Levantar la app en Expo y probar en simulador/dispositivo:
    1. Comportamiento del input al ingresar números en pantallas chicas y grandes.
    2. Transición fluida entre cancelación biométrica y foco en el input numérico.
    3. Adaptabilidad de la grilla al rotar el dispositivo.
