# Bunker Notas - Roadmap & Arquitectura

Este documento recopila las decisiones arquitectónicas, características del MVP y el mapa de ruta (Roadmap) a futuro discutidas para Bunker Notas.

## Principios Fundamentales
1. **Zero-Knowledge (Cero Conocimiento):** Toda la información debe estar encriptada del lado del cliente. Ningún servidor de terceros debe tener acceso al texto plano o a los archivos sin la clave del usuario.
2. **Local-First (Primero Local):** La aplicación debe funcionar de forma autónoma sin depender de una conexión a internet para sus funciones básicas.
3. **Seguridad Nativa:** Uso de biometría y PIN nativos del dispositivo para la apertura de bóvedas seguras.

---

## 1. MVP (Fase Actual)
El objetivo del MVP es establecer un gestor de notas sólido, seguro y con buena usabilidad.

* **Autoguardado (Autosave)**:
  * *Decisión:* Se removió la interfaz manual de "Guardar" y "Cancelar" para agilizar el flujo de uso.
  * *Implementación:* Un debounce de 1 segundo guarda automáticamente el título, contenido, audio y personalización en WatermelonDB dentro de transacciones `database.write(...)` seguras. Si la nota se cierra estando completamente vacía, se limpia automáticamente de la DB para evitar registros huérfanos.
* **Scroll Nativo y UI/UX del Editor**:
  * *Implementación:* El `RichEditor` de `react-native-pell-rich-editor` se configuró con `useContainer={false}` delegando el scroll a una `ScrollView` nativa de React Native. Esto solucionó los bloqueos táctiles del WebView interno en notas largas.
  * *RichToolbar Sticky:* Se posiciona de manera fija directamente flotando arriba del teclado en pantalla mediante `KeyboardAvoidingView` para una edición premium similar a Apple Notes.
  * *Personalización:* Colores y stickers de doodle siempre visibles y accesibles desde la ScrollView sin importar el estado del teclado.
* **Interoperabilidad de Texto (Share Intent)**: 
  * *Problema:* Las aplicaciones de terceros (como Gemini o ChatGPT) bloquean el Deep Linking directo (ej: `bunkernotas://...`) por sus políticas de *sandboxing* de seguridad.
  * *Solución (Workaround):* Implementación de **Share Intent** (`expo-share-intent`). El usuario selecciona un texto en cualquier app, elige "Compartir" y lo envía a Bunker Notas. La app lo recibe nativamente (`shareIntent.text`) y prepara el modal de nueva nota.
* **CI/CD - Compilación Remota**:
  * *Problema:* Limitación de cuotas de compilación en Expo Application Services (EAS) y falta de recursos de hardware en computadoras de desarrollo para compilar localmente con Gradle.
  * *Solución:* Implementación de un flujo de **GitHub Actions** (`.github/workflows/build-android-debug.yml`) que genera el APK debug de Android (`app-debug.apk`) de forma totalmente gratuita y automática en la nube de GitHub con cada push en la rama `main`.

---

## 2. Soporte para Imágenes (Corto/Mediano Plazo)
Permitir la carga de imágenes dentro de las notas de manera segura y performante.

* **El Problema del Base64:** Guardar imágenes grandes en base64 dentro de la base de datos (WatermelonDB) degradaría drásticamente el rendimiento de lectura/escritura.
* **La Decisión de Arquitectura:** 
  1. La imagen original se transforma en una cadena de bytes/buffer.
  2. Se utiliza una librería criptográfica nativa (ej: `expo-crypto` o `react-native-aes-crypto`) para cifrar esos bytes usando la llave maestra del usuario derivada de su PIN.
  3. El archivo resultante (blob/bytes encriptados) se guarda directamente en el sistema de archivos del teléfono (`expo-file-system`).
  4. La base de datos (WatermelonDB) **solo** guarda la referencia (la ruta del archivo) local y su llave de descifrado asociada. 

---

## 3. Asistente de IA Integrado (Largo Plazo)
Implementar una Inteligencia Artificial directamente en la app capaz de redactar o transcribir notas por voz o texto.

* **Estrategia Elegida: BYOK (Bring Your Own Key)**. 
  * Se descarta que Bunker Notas provea la IA por defecto debido a los costos de servidor.
  * La app incluirá un panel de configuración donde el usuario inserta su propia API Key (ej. OpenAI, Anthropic, Gemini).
* **Beneficios de esta arquitectura:**
  * **Multimotor:** El usuario puede elegir qué modelo/empresa usar.
  * **Zero-Knowledge respetado:** Las llamadas a la IA (HTTPS) van directamente del celular del usuario al proveedor (OpenAI/Google). No hay un backend intermedio de Bunker Notas espiando la petición.
  * **Costo cero para el desarrollador:** El consumo de tokens es asumido por el usuario (generalmente fracciones de centavo por nota).
