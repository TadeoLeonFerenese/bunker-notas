# Grabación de Audio y Diseño Responsivo (MVP)

Este plan aborda la Opción 3 elegida: incorporar la capacidad de grabar audios como notas y asegurar que tanto el Dashboard como la pantalla de Login se adapten correctamente a distintos tamaños de pantalla (tablets/celulares) y manejen bien la aparición del teclado.

## 🚨 User Review Required (Requiere tu revisión)

*   **Dependencia Nueva:** Necesitamos instalar `expo-av` para interactuar con el micrófono y reproducir audio nativamente.
*   **Decisión de Seguridad (Audio):** En el esquema actual, el campo `audio_uri` no está encriptado (es un string con la ruta local). En un sistema Zero-Knowledge, lo ideal es encriptar el archivo binario, pero para el MVP podemos guardar el archivo local y asegurar que el acceso esté restringido por el OS, o aplicar encriptación AES. *Dada la etapa de MVP, sugiero guardar la URI estándar y encriptar solo si la nota entera está marcada como "Segura" en una iteración posterior.*

## ❓ Preguntas Abiertas

> [!WARNING]
> **Tanke, confirmame esto antes de arrancar a meter código:**
> 1.  ¿Te parece bien que la grilla de notas en el Dashboard pase a **3 o 4 columnas** si detectamos que estamos en una tablet o modo apaisado (landscape)?
> 2.  Para el login, voy a meter un `KeyboardAvoidingView` y limitar el ancho máximo (`maxWidth: 400px`) para que quede centrado elegante en pantallas grandes. ¿Te cierra ese enfoque minimalista?

## 🛠️ Proposed Changes (Cambios Propuestos)

### Dependencies
*   Instalar `expo-av` usando `npm install expo-av`.

### 1. Pantalla de Login Responsiva
#### [MODIFY] `src/screens/LoginScreen.tsx`
*   Envolver el formulario en un `KeyboardAvoidingView` o `ScrollView` con `contentContainerStyle` centrado.
*   Establecer un `maxWidth: 400` y `alignSelf: 'center'` para el contenedor principal, evitando que se desparrame en pantallas anchas.

### 2. Grabación de Audio
#### [MODIFY] `App.tsx`
*   **Permisos:** Solicitar permiso de micrófono al intentar grabar (`Audio.requestPermissionsAsync`).
*   **UI Modal Crear:** Añadir un botón 🎤 en el modal de nueva nota. Al pulsarlo, comienza a grabar (mostrar tiempo transcurrido). Al soltar o detener, se guarda la URI temporal en el estado.
*   **Persistencia:** Al guardar la nota, el `audio_uri` se pasa a WatermelonDB (ya soportado en el `schema.ts`).
*   **Reproducción:** En el Modal de Lectura (Viewer), si la nota tiene `audioUri`, mostrar un minireproductor (Play/Pause) cargando el sonido con `Audio.Sound`.

### 3. Dashboard Responsivo
#### [MODIFY] `App.tsx`
*   Refactorizar el cálculo de la grilla. En lugar de estar fijo en 2 columnas:
    ```javascript
    const numColumns = width > 768 ? 3 : width > 1024 ? 4 : 2;
    const itemWidth = (width - paddingTotal) / numColumns;
    ```
*   Asegurar que el `SafeAreaView` ocole bien los márgenes en dispositivos grandes.

### 4. Tests (¡TDD Mandatory!)
#### [MODIFY] `__tests__/screens/LoginScreen.test.tsx`
*   Actualizar para verificar que el formulario se renderiza correctamente con los nuevos wrappers.
#### [NEW] `__tests__/notes/AudioRecord.test.ts`
*   Mocks para `expo-av` asegurando que las funciones de inicio y detención de grabación se llamen correctamente según las directrices TDD del proyecto.

## 🧪 Verification Plan

### Automated Tests
*   Correr `npm test` para asegurar que los nuevos componentes de audio no rompan la estructura y que los tests legacy que estructuremos (como el mock de `expo-av`) pasen en verde.

### Manual Verification
*   Levantar `npx expo start` y verificar:
    1. Que el formulario de Login suba al abrir el teclado numérico.
    2. Que al presionar el botón 🎤 pida permisos y grabe.
    3. Que la nota guardada muestre el ícono 🎵 en el feed.
    4. Que al entrar a la nota se pueda reproducir el audio.
    5. Que al rotar la pantalla, la grilla se acomode mágicamente.
