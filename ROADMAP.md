# Bunker Notas - Roadmap & Arquitectura

Este documento recopila las decisiones arquitectónicas, características del MVP y el mapa de ruta (Roadmap) a futuro para Bunker Notas.

## Principios Fundamentales
1. **Zero-Knowledge (Cero Conocimiento) Real:** Toda la información confidencial está cifrada del lado del cliente. Ningún servidor de terceros o base de datos local desprotegida tiene acceso al texto plano o a los archivos sin la clave criptográfica derivada del PIN del usuario.
2. **Local-First (Primero Local):** La aplicación funciona de forma 100% autónoma sin depender de una conexión a internet para sus funciones básicas.
3. **Seguridad Nativa:** Uso de biometría y PIN nativos del dispositivo (Keychain nativo protegido por hardware) para la apertura de bóvedas seguras y la liberación de la clave criptográfica.

---

## 1. MVP (Fase 1: Estabilización del Editor)
El objetivo de esta fase fue establecer un gestor de notas sólido, responsive y con excelente usabilidad táctil.

* **Autoguardado (Autosave)**:
  * Un debounce de 1 segundo guarda automáticamente el título, contenido, audio y personalización en WatermelonDB dentro de transacciones seguras. Si la nota se cierra estando vacía, se limpia de la base de datos para evitar registros huérfanos.
* **Scroll Nativo y UX del Editor**:
  * El editor delega el scroll al `TextInput` nativo multilínea (con `flex: 1` y sin `minHeight` restrictivos). Esto solucionó bugs de saltos bruscos y oclusión del cursor en Android e iOS.
  * **Zona de Cortesía:** Se configuró un `paddingBottom: 40` en el estilo del `TextInput` del contenido. Esto permite al usuario desplazar las últimas líneas de notas largas por encima del teclado virtual y de la barra de herramientas, evitando que el texto quede oculto al escribir en la parte final.
  * **Sticky Toolbar:** La barra de herramientas de formato y colores flota arriba del teclado en pantalla mediante `KeyboardAvoidingView`.

---

## 2. Soporte para Imágenes, Audios, IA y Cifrado Real (MVP 2 - Estado Actual ✅)
Permitir la carga, visualización y recepción (vía Share Intent o local) de imágenes y audios, e integrar un Asistente de IA bajo esquema de seguridad real.

* **La Decisión de Arquitectura Criptográfica:**
  1. **Librería de Cifrado:** Se implementó criptografía real mediante `crypto-js` en puro JavaScript, manteniendo compatibilidad total con el cliente genérico de **Expo Go** y con la suite de tests unitarios en **Jest** sin requerir dependencias nativas pesadas de linkeo.
  2. **Derivación de Clave (Zero-Knowledge):** Al configurar o validar el PIN, la app genera un *salt* criptográfico aleatorio único por dispositivo (guardado en el Keychain en `'app_encryption_salt'`). Usando **PBKDF2** (con 1000 iteraciones), se deriva una clave simétrica **AES-256** a partir del PIN y el salt.
  3. **Clave de Sesión en Memoria (In-Memory Key):** La clave derivada se almacena temporalmente en memoria en la sesión de la app (`encryption.setSessionKey`). Al cerrar la aplicación, la clave se destruye de la memoria física.
  4. **Biometría Segura:** Al iniciar sesión por huella, la app recupera de forma segura el PIN del usuario almacenado en el Keychain nativo (`'app_user_pin'`) para derivar la clave criptográfica en segundo plano de manera transparente.
  5. **Cifrado de Archivos Locales:** Si la nota es segura (`isSecure: true`), los archivos multimedia (fotos y grabaciones de audio) se cifran físicamente en disco (`.enc`) usando AES-256. El visor de la app los descifra en memoria temporal de caché al abrir la nota y los destruye inmediatamente al cerrarla.
  6. **Inmutabilidad de la Seguridad en Notas Existentes:** Una vez que una nota ha sido creada y guardada como segura (`isSecure: true`), no se permite desactivar su cifrado desde el editor. Esto previene condiciones de carrera en el sistema de archivos del dispositivo al intentar desencriptar en caliente fotos o audios asincrónicamente durante el bucle de autoguardado (autosave debounce). Una nota normal sí se puede encriptar más tarde si el usuario lo desea.

* **Recepción Nativa en la APK (Share Intent):**
  * La app intercepta texto, imágenes y audios compartidos desde otras aplicaciones (`expo-share-intent`).
  * **Ajuste de Intents en la APK:** Se modificó `app.json` agregando `"singleShareMimeTypes": ["text/plain", "image/*", "audio/*"]` para asegurar que el sistema operativo Android registre la app en la lista nativa de compartir cuando el usuario selecciona fotos o archivos de voz en aplicaciones externas.

* **Asistente de IA Integrado (BYOK & Zero-Knowledge):**
  * **Estrategia BYOK (Bring Your Own Key):** La app incluye un panel de configuración seguro (con enlaces de obtención de API Keys en el modal) donde el usuario inserta su propia API Key (Gemini o OpenAI).
  * **Privacidad Absoluta:** Las llamadas a la IA (transcripción por voz y prompts de chat) van directo desde el celular del usuario al proveedor (OpenAI/Google). No hay un servidor intermedio que audite los datos.
  * **Acceso y UX en Dashboard:** Se desvinculó el Asistente del editor de notas, ubicándose como un botón de acción flotante (FAB) simétrico en el margen izquierdo inferior del Dashboard principal (con fondo de acento y robot blanco). Abre un modal flotante responsive (`KeyboardAvoidingView`) con botones de acción simétricos ("Cancelar" / "Generar") y el botón de micrófono reubicado al lado del input de texto. Al completarse la respuesta de la IA, se crea una nota y se abre en modo editor de forma transparente.
  * **Validación de Keys con Diagnóstico y Bypass:** Al configurar la API Key se valida mediante un "ping" al servicio. Si la validación falla (sea por credenciales incorrectas o restricciones de red/VPN corporativas), la app muestra un **Mini Log Técnico Estructurado** detallando el error y ofrece un bypass de **"Guardar de todos modos"** para evitar bloqueos por problemas de conexión locales.

* **Seguridad y Centrado de Modales:**
  * **Modal de PIN Centrado y Responsive:** Se modificó la interfaz de solicitud de PIN (al abrir o borrar notas seguras) para centrarse verticalmente en pantalla de forma idéntica a las demás alertas. Se le incorporó `KeyboardAvoidingView` para evitar que el teclado numérico de ingreso obstruya los botones o la caja del PIN en dispositivos medianos.
  * **Fijación de PIN a 6 Dígitos:** Para evitar espacios vacíos confusos en la UI de entrada, se fijó el PIN de seguridad del usuario en exactamente 6 dígitos para el registro y validación.
  * **Iconografía en Login:** Se actualizó el diseño de la pantalla de Login reemplazando el escudo de seguridad por el icono nativo de la aplicación (`icon.png`), mejorando la identidad visual.

* **Portabilidad y Preservación de Historial:**
  * Respaldos encriptados locales con extensión `.bunker`.
  * **Preservación de Fechas en Backup:** `BackupService.ts` respeta los timestamps originales (`createdAt`/`updatedAt`) de las notas al importarse desde el archivo `.bunker` modificando el `_raw` de WatermelonDB en la transacción batch.

---

## 3. Próximos Pasos Identificados
1. **Reemplazar LokiJSAdapter por SQLiteAdapter en WatermelonDB:** Migrar a la base de datos nativa SQLite en producción para mayor velocidad con bases de datos grandes (requerirá compilación nativa de EAS Build).
2. **Modo Sincronización Local-First:** Desarrollar el sistema de sincronización selectiva con el backend remoto.
3. **Soporte para Motores de IA Gratuitos/Open-Source:** Integrar proveedores como Groq, OpenRouter o HuggingFace para permitir el uso de modelos gratuitos (como DeepSeek, Mixtral o Llama) mitigando la dependencia de APIs pagas y bloqueos por saturación en proveedores corporativos.

---

## 5. Descarga de APK compilada desde otra PC

Para descargar la última versión de la APK (`app-debug.apk`) desde cualquier computadora sin tener que configurar ningún entorno de desarrollo local, seguí estos pasos sencillos:

1. **Ingresar a GitHub:** Abrí el navegador y accedé al repositorio oficial del proyecto: `https://github.com/TadeoLeonFerenese/bunker-notas`.
2. **Ir a la pestaña de Actions:** En el menú superior del repositorio, hacé click en la pestaña **Actions**.
3. **Seleccionar la ejecución del Workflow:** Buscá la ejecución más reciente en la rama `main` (que coincide con el último commit pusheado) y hacé click sobre ella.
4. **Descargar el artefacto (Artifact):**
   * Desplazate hasta la sección **Artifacts** en la parte inferior de la página de detalles del Workflow.
   * Hacé click en el enlace `app-debug` para descargar el archivo comprimido.
5. **Instalar en el dispositivo:** Descomprimí el archivo `.zip` obtenido, extraé la APK (`app-debug.apk`) y transferila o mandala a tu celular Android para instalarla directamente.

