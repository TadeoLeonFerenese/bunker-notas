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

## 2. Soporte para Imágenes y Audios (MVP 2)
Permitir la carga y recepción (vía Share Intent o local) de imágenes y audios dentro de las notas de manera segura y performante.

* **El Problema del Base64 y Archivos Sueltos:** Guardar imágenes grandes en base64 dentro de la base de datos (WatermelonDB) degrada el rendimiento. Asimismo, guardar audios o fotos en texto plano en el almacenamiento público compromete el principio Zero-Knowledge de la app.
* **La Decisión de Arquitectura:**
  1. **Recepción:** Cuando la app recibe un archivo (imagen o audio) vía Share Intent o selección local, se copia temporalmente a `FileSystem.documentDirectory`.
  2. **Cifrado Simétrico (Zero-Knowledge):** Si el usuario marca la nota como **segura/encriptada** (candado activo), el archivo binario completo se cifra usando AES-256 con la llave maestra derivada de su PIN.
  3. **Almacenamiento Local-First:** El archivo cifrado resultante se guarda directamente en el sistema de archivos privado de la app (`FileSystem.documentDirectory`).
  4. **Referencia en DB:** La base de datos (WatermelonDB) solo almacena la referencia (la ruta del archivo local) y el estado de cifrado.
  5. **Descifrado en Caliente:** Al abrir una nota segura, el archivo se descifra en memoria temporal para renderizarse en el visor de imágenes o reproducirse en el reproductor de audio, limpiándose inmediatamente al cerrar el modal.

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
