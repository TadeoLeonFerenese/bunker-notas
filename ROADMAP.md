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
  7. **Corrección de Validación de PIN (PBKDF2 + Salt):** Se alinearon las funciones `hashPin` y `verifyPin` en `encryption.ts` para usar PBKDF2 con salting real al registrar y validar el acceso de usuario en `LoginScreen.tsx` y `App.tsx`, eliminando un hash bitwise legacy inseguro. Se incluyó un mecanismo de fallback para hashes antiguos menores a 20 caracteres para evitar cierres patronales de usuarios existentes.

* **Recepción Nativa en la APK (Share Intent):**
  * La app intercepta texto, imágenes y audios compartidos desde otras aplicaciones (`expo-share-intent`).
  * **Ajuste de Intents en la APK:** Se modificó `app.json` agregando `"singleShareMimeTypes": ["text/plain", "image/*", "audio/*"]` para asegurar que el sistema operativo Android registre la app en la lista nativa de compartir cuando el usuario selecciona fotos o archivos de voz en aplicaciones externas.

* **Asistente de IA Integrado (BYOK & Zero-Knowledge):**
  * **Estrategia BYOK (Bring Your Own Key):** La app incluye un panel de configuración seguro (con enlaces de obtención de API Keys en el modal) donde el usuario inserta su propia API Key (Gemini, OpenAI, Cohere o Groq).
  * **Almacenamiento Multi-Key Seguro:** Se almacena cada API Key de forma independiente en el Keychain nativo (`app_ai_key_${provider}`) junto con la carga automatizada al cambiar de proveedor y un mecanismo transparente de migración de claves legacy en el primer inicio de la app.
  * **Privacidad Absoluta:** Las llamadas a la IA (transcripción por voz y prompts de chat) van directo desde el celular del usuario al proveedor (OpenAI/Google/Cohere/Groq). No hay un servidor intermedio que audite los datos.
  * **Rediseño del Asistente de IA e Input Responsive:**
    * El Asistente se ubica como un botón de acción flotante (FAB) en el margen izquierdo inferior del Dashboard. Abre un modal flotante posicionado abajo (sobre el FAB) con una altura estricta del **48% de la pantalla** (`height: height * 0.48`), lo que asegura que quepa perfectamente por encima del teclado sin ocluirse ni salirse por el borde superior de celulares pequeños.
    * **Micrófono al Header y Ancho Completo:** Eliminamos el subtítulo ruidoso y reubicamos el botón de micrófono al encabezado al lado del título "Asistente IA", permitiendo que el input de prompt flexible ocupe el **100% de ancho de la tarjeta** de forma súper espaciosa. En reposo el micrófono está limpio sin cajas de fondo, y al grabar se enciende en rosado con icono `stop`.
  * **Validación de Keys con Diagnóstico y Bypass:** Al configurar la API Key se valida mediante un "ping" al servicio. Si la validación falla (sea por credenciales incorrectas o restricciones de red/VPN corporativas), la app muestra un **Mini Log Técnico Estructurado** detallando el error y ofrece un bypass de **"Guardar de todos modos"** para evitar bloqueos por problemas de conexión locales.
  * **Soporte para Motores Gratuitos y Open-Source (Cohere & Groq):**
    * Se integró **Cohere** (usando la API oficial con el modelo `command-r` a través de `https://api.cohere.com/v1/chat`) en reemplazo de DeepSeek por su capa gratuita estable de desarrollo (Trial Key).
    * > [!IMPORTANT]
      > **Restricción Comercial de Cohere:** La clave de Cohere (Trial Key) tiene limitaciones estrictas para uso no comercial. Si el proyecto avanza a una fase comercial en producción, este proveedor deberá ser reemplazado por un endpoint con licencia comercial (como Cohere Production Key, OpenAI de pago, o Gemini API).
    * Se mantiene integrado **Groq** (usando `llama-3.1-8b-instant` para chat, y transcripción de voz con Whisper `whisper-large-v3` gratuita). Esto mitiga las caídas o bloqueos de APIs corporativas.
  * **Optimización de Prompts y Formateo (Zero Hallucination):**
    * **System Prompts Estrictos:** Se implementaron instrucciones a nivel de sistema para los motores de IA que impiden la generación de comentarios conversacionales, saludos o introducciones ruidosas.
    * **Estructuración por JSON:** Al crear notas desde el Dashboard, la IA responde únicamente con un objeto JSON `{"title": "...", "content": "..."}`. Esto separa limpiamente el título del cuerpo y previene que se mezclen.
    * **Reconocimiento de Títulos y Markdown:** El motor es capaz de interpretar indicaciones explícitas de títulos (ej: "el título es X") y genera formato enriquecido de listas (`- elemento`) y negritas (`**texto**`) automáticamente al detectar dictados de enumeraciones o elementos clave, los cuales se renderizan nativamente en la UI.


* **Solución de Warning en React Native Web:**
  * **Advertencia de Nodos de Texto Inesperados:** Se resolvió el error de React Native Web `Unexpected text node: . A text node cannot be a child of a <View>` en `NoteCard.tsx` aplicando cast booleano explícito `!!` en cortocircuitos JSX de strings opcionales (`!!note.audioUri` y `!!illustrationEmoji`), previniendo fugas de cadenas vacías en contenedores del DOM.
  
* **Seguridad y Centrado de Modales:**
  * **Modal de PIN Centrado y Responsive:** Se modificó la interfaz de solicitud de PIN (al abrir o borrar notas seguras) para centrarse verticalmente en pantalla de forma idéntica a las demás alertas. Se le incorporó `KeyboardAvoidingView` para evitar que el teclado numérico de ingreso obstruya los botones o la caja del PIN en dispositivos medianos.
  * **Fijación de PIN a 6 Dígitos:** Para evitar espacios vacíos confusos en la UI de entrada, se fijó el PIN de seguridad del usuario en exactamente 6 dígitos para el registro y validación.
  * **Iconografía en Login:** Se actualizó el diseño de la pantalla de Login reemplazando el escudo de seguridad por el icono nativo de la aplicación (`icon.png`), mejorando la identidad visual.

* **Polishing de UI/UX y Endurecimiento de Prompts (Cierre MVP 2 ✅):**
  * **Barra de Búsqueda Animada:** Rotación fluida en el eje X (Fade + Slide) entre "Buscar Notas" y "Bunker Notas" centrada horizontalmente.
  * **System Instruction Unificado:** Inyección de `SYSTEM_INSTRUCTION` estricto en todos los proveedores de IA (`AIService.ts`) para eliminar respuestas conversacionales y asegurar generación al pie de la letra.
  * **Recorte de Logo:** Centrado y clipping perfecto del icono en la cabecera mediante escalado `1.25` y `overflow: hidden`.

---

## 3. MVP 3 (Fase 3: Notificaciones Locales, Calendario Nativo y Google Drive Backup ✅)

1. **Integración con Calendario Nativo y Recordatorios (Completado ✅):**
   * **Servicio de Recordatorios Encapsulado:** Se creó `ReminderService.ts` utilizando `expo-notifications` y `expo-calendar` para programar alertas locales de una sola vez, solicitar permisos al dispositivo, gestionar eventos en la agenda interna y cancelar notificaciones al eliminar o actualizar notas.
   * **Canal de Notificaciones de Alta Prioridad en Android (API 26+):**
     * Se implementó `setupNotificationChannel()` configurando el canal `bunker_reminders` con `AndroidImportance.MAX`, sonido por defecto y patrón de vibración `[0, 250, 250, 250]`. Esto garantiza que las alarmas traspasen los modos de optimización de batería agresivos en dispositivos Android (Xiaomi MIUI/HyperOS, Samsung OneUI, Motorola, etc.).
   * **Migración de Esquema (WatermelonDB v3):** Se incrementó la versión del esquema de la base de datos de v2 a v3 en `schema.ts`. Se definieron las columnas `reminder_at` y `calendar_event_id` y su correspondiente migración segura en `migrations.ts` y decoradores en `Note.ts`.
   * **Preservación de Getters de WatermelonDB en React State:**
     * *Problema Resuelto:* Al actualizar `selectedNote` tras agendar una alarma, el operador spread `{ ...prev }` sobre instancias de `NoteModel` vaciaba las propiedades de clase no enumerables (`title`, `content`), dejando la pantalla en blanco.
     * *Solución:* Mapeo explícito de propiedades (`id`, `title`, `content`, `isSecure`, `isMarked`, `audioUri`, `color`, `illustration`, `createdAt`, `reminderAt`, `calendarEventId`) al modificar el estado.
   * **UI Intuitiva Segmentada en 2 Pasos:**
     * **Gestión desde el Visor (Viewer Modal):** Para notas existentes, el recordatorio se administra directamente desde el visor de notas (Viewer Modal), liberando de carga al editor de texto.
     * **Gestión al Crear y al Editar:** La campanita de recordatorio está disponible tanto en la creación (`+`) como durante la edición de cualquier nota existente.
     * **Modal Segmentado (Fecha + Hora):** Modal flotante de 2 pasos con accesos rápidos `[Hoy]` `[Mañana]`, selector de almanaque estructurado `[Día/Mes/Año]`, presets de momento del día (`🌅 Mañana 09:00`, `☀️ Tarde 15:00`, `🌙 Noche 21:00`, `⏱️ Hora Exacta`) y vista previa en tiempo real.
     * **Selectores de Hora Exacta Optimizados:**
       * *En Web:* Dos selectores independientes (`<select>`) para Horas (`00`-`23`) y Minutos (`00`-`59`), eliminando la tosquedad del input de tiempo nativo del navegador.
       * *En Nativo (Android/iOS):* Apertura del `DateTimePicker` nativo del sistema para selección táctil con reloj/rueda, filtrando eventos secuenciales (`event.type === 'set'`) para permitir selección independiente de hora y minutos sin cierres prematuros.
     * **Validación de Horarios:** Bloqueo proactivo con alerta cuando se intenta agendar una hora que ya transcurrió en el día de hoy.
     * **Modificación y Eliminación Fluida (Sin Bloqueos):** Se eliminó el diálogo `Alert.alert` del sistema operativo (que se congelaba en navegadores web). Al tocar la campanita de una nota con alarma activa, el modal se abre de inmediato con el horario guardado y expone un botón directo de `🗑️ Eliminar` en rojo junto a `Cancelar` y `Confirmar`.
     * **Limpieza Dinámica de Recordatorios Vencidos:** Los iconos de recordatorio (campana en visor y reloj en tarjetas de notas) se ocultan automáticamente una vez transcurrida la fecha programada (`reminderAt > Date.now()`), permitiendo programar nuevas alarmas inmediatamente y limpiando la base de datos en el siguiente guardado.
   * **Rediseño Responsive del Header del Visor (Estilo Apple Notes / Google Keep):**
     * Separación de la barra de acciones superior (izquierda: color y badge `🔒 Segura`; derecha con `flexShrink: 0`: `🔔`, `Editar`, `✕`) del **Título principal** ubicado abajo a ancho completo (`100%`) con `wordBreak: 'break-word'` y `overflowWrap: 'break-word'`, garantizando que cadenas continuas o títulos largos nunca colisionen con los botones.
   * **Indicadores en Dashboard:** Badges con icono de reloj (⏰) en `NoteCard.tsx` tanto en la vista de grilla como en la de lista cuando una nota posee un recordatorio activo.
   * **Suite de Pruebas Unificadas:** Mocks de `expo-notifications`, `expo-calendar` y `@react-native-community/datetimepicker` en `jest.setup.js` manteniendo la suite unitaria en verde (17 suites exitosas, 92 tests pasados).

2. **Estrategia de Distribución, Monetización y Publicación en Google Play Store:**
   * **Distribución Segura:** Se descarta el uso de GitHub Releases públicos para descargas gratuitas de la APK de producción.
   * **Monetización en Google Play Store:** Venta de la app (Paid App) o descargas gratuitas con compras In-App (suscripciones para almacenamiento en la nube, sincronización selectiva u otras features premium).

---

## 🎯 Meta Especial Meticulosa: Publicación en Google Play Store (Checklist de Producción)

Para subir Bunker Notas a la tienda oficial de Google Play Store sin rechazos ni bloqueos administrativos, se deben cumplir puntillosamente los siguientes 6 pilares:

### 1. Registro y Verificación en Google Play Console 💳
- [ ] **Cuenta de Desarrollador:** Registro en [Google Play Console](https://play.google.com/console) ($25 USD pago único con tarjeta de crédito/débito).
- [ ] **Verificación de Identidad:** Enviar documento oficial (DNI / Pasaporte) y comprobante de dirección/teléfono para validar la cuenta personal o de empresa.

### 2. Generación del Bundle de Producción (`.aab`) y Keystore 🔑
- [ ] **Google Play Exige `.aab`:** No se permiten archivos `.apk` para la tienda. Se debe generar un **Android App Bundle (`.aab`)**.
- [ ] **Keystore de Producción:** Generar y resguardar en un lugar seguro fuera de Git la clave de firma `bunker-release-key.jks` con su `alias`, `storePassword` y `keyPassword`. *(¡Importante! Activar Google Play App Signing en la consola para no perder el control de actualizaciones).*
- [ ] **Incremento de Versiones en `app.json`:**
  - `version`: ej. `"1.0.0"`
  - `android.versionCode`: número entero incremental (ej. `1`, `2`, `3`...).
- [ ] **Build de Release Automatizado:** Configurar GitHub Actions en `.github/workflows/` (o ejecutar `eas build --platform android --profile release`) para compilar el archivo `app-release.aab`.

### 3. Fase Obligatoria de Pruebas Cerradas (20 Testers x 14 Días) 🧪
- [ ] **Requisito Innegociable de Google (Cuentas Creadas Post-Nov 2023):** Google exige probar la app con al menos **20 testers registrados** que permanezcan inscritos durante **14 días consecutivos** en la pestaña de **Prueba Cerrada (Closed Testing)** antes de habilitar la solicitud de publicación en producción.
- [ ] **Reclutamiento de Testers:** Cargar la lista de 20 correos electrónicos de Gmail de testers autorizados.
- [ ] **Subir `.aab` al Track Cerrado:** Publicar la primera compilación en la track de Prueba Cerrada para iniciar el contador oficial de 14 días.

### 4. Política de Privacidad Legales (URL Pública Mandatoria) 📜
- [ ] **URL Pública de Privacy Policy:** Exigido por Google debido al uso de Biometría, Audio y Notificaciones.
- [ ] **Redacción Zero-Knowledge:** Alojar un documento `PRIVACY.md` público (vía GitHub Pages `https://tadeoleonferenese.github.io/bunker-notas/privacy` o Vercel) declarando explícitamente:
  - Cifrado local **Zero-Knowledge** en el cliente (AES-256).
  - Ningún dato personal, nota o audio es transmitido a servidores de los desarrolladores.
  - La clave del PIN vive únicamente en el hardware seguro del celular del usuario (`Keychain`).

### 5. Store Listing Assets (Ficha de la Tienda) 🎨
- [ ] **Icono de la Aplicación:** PNG de 512 x 512 px (32-bit, máx. 1024KB).
- [ ] **Gráfico de Funciones (Feature Graphic):** Imagen de 1024 x 500 px (banner promocional de Bóveda Segura).
- [ ] **Capturas de Pantalla (Screenshots):**
  - **Celulares (Mobile):** Al menos 4 capturas en resolución `1080 x 1920 px` mostrando: Dashboard, Editor Rich Text, Modal de PIN y Recordatorios.
  - **Tablets (7" y 10"):** Al menos 1 captura adaptada por cada tamaño de pantalla.
- [ ] **Textos de la Ficha:**
  - **Título:** `Bunker Notas - Bóveda Segura` (máx. 30 caracteres).
  - **Descripción Corta:** máx. 80 caracteres (ej: *"Notas 100% privadas cifradas con AES-256 y backups en tu Google Drive."*).
  - **Descripción Larga:** Hasta 4000 caracteres detallando el modelo Zero-Knowledge, la IA BYOK, notas de voz y alarmas.

### 6. Declaración de Permisos y Clasificación en Play Console 📝
- [ ] **Sección de Seguridad de Datos (Data Safety):** Declarar que la app **no comparte datos con terceros** y que los datos están cifrados en tránsito y reposo.
- [ ] **Cuestionario IARC:** Completar el formulario de clasificación por edades (Apto para todo público / PEGI 3).
- [ ] **Declaración de Permisos Sensibles:** Justificar en la consola el uso de `RECORD_AUDIO` (notas de voz), `USE_BIOMETRIC` (desbloqueo) y `POST_NOTIFICATIONS` / `USE_EXACT_ALARM` (alarmas locales).

---

3. **Google Drive Silent Zero-Knowledge Auto-Backup (Completado ✅):**
   * **Problema:** En aplicaciones Local-First, si el usuario pierde, rompe o cambia de celular sin realizar una exportación manual previa, la base de datos local (WatermelonDB) se pierde irremediablemente.
   * **Solución Arquitectónica:** Sistema de copias de seguridad automáticas en segundo plano utilizando la carpeta privada de aplicaciones de **Google Drive (`appDataFolder`)** de la propia cuenta del usuario, garantizando cero costos de servidor.
   * **Pilares de la Solución:**
     1. **Cero Costo de Servidores:** Almacenamiento directo en el Drive personal del usuario (15GB gratis).
     2. **Cifrado Real Zero-Knowledge:** Todo el backup (notas y metadatos) se exporta en JSON y se cifra usando **AES-256** con la clave derivada del PIN (PBKDF2 + Salt). Ni Google ni nadie más que el usuario con su PIN puede leer la información.
     3. **Sincronización Incremental de Multimedia:** Las notas de voz y fotos se encriptan individualmente y se suben como archivos separados, permitiendo sincronización incremental eficiente y previniendo fallas de memoria (OutOfMemory) en el celular.
     4. **Frecuencia Inteligente y Programable:** Configuración de backups manuales o programados (Diario / Semanal) en segundo plano (AppState en background) para evitar procesos innecesarios y consumo excesivo de batería/datos.
     5. **Autenticación PKCE (Expo Go Friendly):** Flujo de OAuth2 con PKCE implementado 100% en JavaScript puro, manteniendo compatibilidad con Expo Go y sin dependencias nativas pesadas que compliquen el desarrollo local.
     6. **Gestión Segura de Client Secret en Hardware Keystore:** Soporte para ingresar el `client_secret` de Google Cloud Console (requerido por clientes Web de Google) cifrado a nivel de chip del dispositivo (`storeSecureCredential`), evitando errores de `client_secret is missing` sin romper el modelo serverless.
          * > [!IMPORTANT]
            > **Configuración de Google Cloud Console (OAuth Platform - Interfaz Unificada):**
            > 1. **Tipo de Cliente Obligatorio:** Para PKCE en JavaScript puro, el Client ID en Google Cloud Console debe registrarse obligatoriamente como **"Web Application" (Aplicación Web)** y no como "Android". Los clientes Android exigen firmas SHA-1 y bloquean el intercambio de token directo por HTTP, impidiendo el funcionamiento.
            > 2. **Nueva Interfaz "OAuth Platform":** En los proyectos modernos de Google Cloud, las opciones se gestionan en la URL `/auth/...` bajo la nueva barra de navegación lateral unificada de la plataforma:
            >    * **Pestaña `Público` (Audience):** Se configura el tipo de usuario como **Externo** y se agregan los correos autorizados en la sección **Usuarios de prueba (Test Users)**. Esto es indispensable para evitar el error `403: access_denied` durante la fase de desarrollo.
            >    * **Pestaña `Clientes` (Clients):** Es la sección donde se crean y obtienen los Client IDs (Credenciales de OAuth) y Client Secrets.
            >    * **Pestaña `Identidad de marca` (Branding):** Configura los datos básicos de la app (Nombre y correo de soporte).

4. **Modo Sincronización Local-First (Próxima Fase 🎯):**
   * Sistema de sincronización selectiva cliente-servidor cifrado de extremo a extremo para usuarios con infraestructura propia o servidores dedicados.

5. **Mejoras UX, Responsividad y Splash Screen (Completado ✅):**
   * **Corrección de Logo en Splash Screen de la APK:** Se actualizó `app.json` (`splash.image`) y se sincronizó `assets/splash-icon.png` con el icono oficial de la app (`icon.png`), eliminando el logo genérico por defecto de Expo al abrir la APK compilada.
   * **Diseño Responsivo en Pantalla de Inicio (LoginScreen):**
     * Se envolvió la vista en un `<ScrollView keyboardShouldPersistTaps="handled">` para que, al desplegarse el teclado numérico del sistema para ingresar el PIN de 6 dígitos, el contenido no quede apretado ni recortado.
     * Se redujo el padding vertical e iconos excesivamente grandes (logo de 88px a 72px, espacios ajustados), garantizando adaptabilidad perfecta en pantallas de cualquier tamaño.

6. **Tareas Pendientes & Bugs en Seguimiento 🔍:**
   * **Bug de Diseño en el Editor tras Crear Nota con IA:** Revisar el layout, scroll, teclado y espaciado/padding visual al escribir dentro de una nota que acaba de ser generada e insertada automáticamente en el editor desde el modal de Asistente de IA del Dashboard.

---

## 4. Guía de Procedimiento y Prompts a Futuro 🚀

Para mantener la calidad del proyecto, la integridad de la arquitectura Zero-Knowledge y optimizar las futuras interacciones con la IA, seguir estas pautas:

### 1. Principios Arquitectónicos Inamovibles:
* **Local-First & Zero-Knowledge:** Todas las llaves (PIN, derivación PBKDF2, Client Secret) deben vivir únicamente en el dispositivo (Hardware Keystore via `storeSecureCredential`). No agregar proxies o servidores intermedios para la sincronización con Google Drive.
* **Componentes UI Puros:** Evitar modales nativos de selector de tiempo que causan bugs de reseteo en Android (`DateTimePicker mode="time"`). Priorizar controles React Native puros (steppers `+`/`-`, chips de presets o selects limpios).

### 2. Estructura Sugerida para Prompts Futuros:
* **Fallas o Bugs de UI:** `"Tengo un problema visual en la pantalla X: [describir sintoma]. Revisá responsividad, padding y teclado antes de tocar la lógica."`
* **Nuevas Features:** `"Quiero implementar [Feature]. Recordá mantener el modelo Zero-Knowledge, correr la suite de pruebas (92 tests) y actualizar ROADMAP.md."`
* **Compilación:** `"Hacé el push a main para que el workflow genere la APK."` (La IA **NUNCA** ejecuta builds locales tras hacer cambios, respeta la regla de no compilar localmente).

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

