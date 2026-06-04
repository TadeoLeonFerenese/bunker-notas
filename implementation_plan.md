# Plan de Implementación: Lanzamiento y Interoperabilidad con IA (MVP Fase 2)

Este plan de implementación detalla la hoja de ruta técnica para la **Fase 2 de Bunker Notes**, priorizando una arquitectura **100% Offline-First (Local-First)** y preparando la aplicación para su distribución en el **Google Play Store**, además de integrar la funcionalidad de creación de notas externas mediante IAs (Gemini, ChatGPT) a través de **Deep Linking** y **Share Intents**.

---

## 🏛️ Decisiones de Arquitectura y Negocio (Aprobadas por el Usuario)

1. **Prioridad Offline-First (Local-First):**
   - Para no complicar el desarrollo inicial y preservar la filosofía de seguridad **Zero-Knowledge**, la aplicación no dependerá de un servidor centralizado de sincronización. Las notas se guardan de forma 100% local en SQLite (WatermelonDB).
   - Los respaldos seguirán realizándose localmente como archivos `.bunker` encriptados que el usuario puede subir a su propia nube (Google Drive, Dropbox, etc.).
   
2. **Canal de Distribución (Google Play Store):**
   - El objetivo es compilar la app y subirla a la Play Store en formato App Bundle (`.aab`) mediante EAS Build de Expo.
   - *Nota de Estado:* El usuario creará la cuenta de desarrollador de Google Play Console ($25) más adelante, por lo que las tareas se dividen en "Preparación de Build" y "Lanzamiento".

3. **Integración con Inteligencias Artificiales (Interoperabilidad Local):**
   - Dado el enfoque offline, la comunicación con IAs externas ocurrirá en el dispositivo por dos vías:
     - **Vía 1: Deep Linking (Esquema de URL):** La aplicación registrará la URI `bunkernotas://create?title=X&content=Y`. Las IAs (Gemini, ChatGPT) podrán generar este enlace en el chat; al tocarlo, Bunker Notes se abrirá y precargará los datos.
     - **Vía 2: Share Intent (Menú Compartir):** Integrar la app en el menú contextual "Compartir" de Android. El usuario podrá seleccionar texto en el chat de la IA, presionar "Compartir" y elegir "Bunker Notes" para crear la nota al instante.
   - **Ciclo de Seguridad:** Cualquier nota recibida por canal externo se abrirá en el Modal de Edición para que el usuario la revise, elija si desea marcarla como "Segura" (encriptada) y presione "Guardar" de forma explícita.

---

## 🛠️ Desglose de Tareas e Implementación

### Fase 1: Interoperabilidad con IA (Links e Intents)

#### [MODIFY] [app.json](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/app.json)
- Configurar el esquema de URL agregando `"scheme": "bunkernotas"` en la raíz de la configuración de Expo.
- Configurar los `intentFilters` en la sección de Android para registrar el filtro de compartir texto (`SEND` action con mimeType `text/plain`).

#### [MODIFY] [App.tsx](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/App.tsx)
- Utilizar `expo-linking` para capturar la URL de inicio y suscribirse a eventos de URL en segundo plano (`Linking.useURL()`).
- Implementar un parser para extraer los parámetros `title` y `content` cuando se recibe la URI `bunkernotas://create`.
- Modificar el flujo para que, al detectar parámetros entrantes válidos, se levante automáticamente el Modal de Creación cargando dicho texto.

#### [NEW] [useShareIntent.ts](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/src/hooks/useShareIntent.ts) (o plugin nativo)
- Implementar la escucha de "Compartir Texto" (Share Intent) utilizando una librería nativa como `expo-share-intent` para capturar texto enviado desde otras apps cuando la aplicación esté en segundo o primer plano.

---

### Fase 2: Preparación para Google Play Store (EAS Build)

#### [MODIFY] [app.json](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/app.json)
- Configurar el nombre oficial de la aplicación a `"name": "Bunker Notes"` (ya realizado).
- Definir la configuración de compilación de Android:
  ```json
  "android": {
    "package": "com.tadeoleon.bunkernotas",
    "versionCode": 1,
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#000000"
    }
  }
  ```
- *Nota:* Asegurar que los assets de iconos estén actualizados con el logo oficial sobre fondo negro en resolución `1024x1024` (ya realizado).

#### [MODIFY] [eas.json](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/eas.json)
- Validar el perfil de producción (`production`) para que el `buildType` compile un `.aab` (App Bundle) en lugar de un `.apk`, ya que Google Play Store solo acepta `.aab` para nuevas aplicaciones.

---

## 🧪 Plan de Verificación

### Pruebas de Deep Linking (Desarrollo)
- Ejecutar en la terminal de comandos con la app corriendo en modo de desarrollo:
  ```bash
  npx uri-scheme open bunkernotas://create?title=Prueba%20IA&content=Contenido%20de%20ejemplo --android
  ```
- Validar que Bunker Notes se abra, requiera PIN/huella si está configurada la seguridad global, y posteriormente abra el modal de creación con los campos "Prueba IA" y "Contenido de ejemplo" precargados.

### Pruebas de Compilación
- Generar la compilación oficial de producción en la nube de EAS:
  ```bash
  eas build --platform android --profile production
  ```
- Confirmar que EAS compila exitosamente y genera el archivo `.aab` firmado para subir a Play Console.

---

## 🚀 Resumen del Trabajo Realizado (De Principio a Fin)

Hemos completado el flujo técnico de la Fase 2 del plan de la siguiente forma:

1. **Gestión Segura de PIN ([PinManager.ts](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/src/auth/PinManager.ts) & [PinManager.test.ts](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/__tests__/auth/PinManager.test.ts)):**
   - Creamos una clase utilitaria para interactuar con la zona segura del dispositivo (`react-native-keychain`).
   - Implementamos un PIN estrictamente numérico (entre 4 y 6 dígitos) que actúa como respaldo Zero-Knowledge.
   - Diseñamos y ejecutamos tests unitarios cubriendo todos los casos de éxito, validación errónea y excepciones físicas.

2. **Refuerzo en el Acceso de la App ([LoginScreen.tsx](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/src/screens/LoginScreen.tsx) & [LoginScreen.test.tsx](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/__tests__/screens/LoginScreen.test.tsx)):**
   - Forzamos la configuración obligatoria del PIN Maestro la primera vez que se inicia la app.
   - Si ya existe un PIN guardado y el dispositivo soporta biometría, se solicita la huella/rostro primero, cayendo en el PIN como alternativa segura ante fallos o cancelaciones.

3. **Corrección Crítica de Compilación (Gradle, Nueva Arquitectura y Versiones):**
   - **Activación de Nueva Arquitectura:** Cambiamos `"newArchEnabled": true` en `app.json`.
   - **Upgrade de Reanimated a v4:** Instalamos `react-native-reanimated` en la versión `~4.1.1` (la recomendada por Expo SDK 54). Esto resolvió el error de compilación Java (`compileReleaseJavaWithJavac`) que ocurría porque Reanimated v3 es incompatible con las APIs internas de React Native 0.81.5.
   - **Compatibilidad con WatermelonDB:** Al tener configurado `jsi: false` en `src/database/index.ts`, WatermelonDB interactúa a través de su bridge de compatibilidad tradicional y compila exitosamente bajo la Nueva Arquitectura.
   - **Compatibilidad de Share Intent:** Corregimos la versión de `expo-share-intent` a la rama `^5.1.1` para alinearla al Expo SDK 54 del proyecto (evitando conflictos con SDK 55).
   - **Permisos de Face ID:** Agregamos el plugin `expo-local-authentication` a `app.json` con la descripción del permiso para iOS.

4. **Configuración de Compilación Local y EAS ([eas.json](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/eas.json)):**
   - Agregamos el perfil de EAS `preview` configurado para compilar directamente a formato `.apk` local para Android (`"buildType": "apk"`), facilitando las pruebas de Deep Linking y Intents directamente en tu teléfono.

5. **Validación de la Suite de Tests:**
   - Aseguramos que la suite total de Jest esté en estado verde (13 suites, 68 tests exitosos en total), sin romper ninguna restricción arquitectónica del manifiesto.

