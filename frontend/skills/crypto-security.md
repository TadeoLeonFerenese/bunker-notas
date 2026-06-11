# Skill: Criptografía y Seguridad Local (Zero-Knowledge)

## Overview

Este skill detalla el estándar de implementación para el cifrado AES-256 local en Bunker Notas, la derivación de llaves, el almacenamiento seguro en Keychain y el manejo seguro de archivos binarios (imágenes) sin comprometer el rendimiento del dispositivo.

## Principios Criptográficos de Bunker Notas

1. **Cifrado Simétrico AES-256:** Toda nota marcada como segura y cualquier archivo asociado (imágenes/audio) debe cifrarse usando AES-256 (preferentemente modo GCM o CBC con un IV único por archivo).
2. **Derivación de Clave (PBKDF2):** Nunca uses el PIN del usuario directamente como contraseña de cifrado. Se debe derivar usando PBKDF2 (con al menos 10,000 iteraciones y una sal única almacenada localmente).
3. **Almacenamiento de Llaves Seguras:** La llave maestra derivada o el token de sesión se almacena únicamente en el almacenamiento seguro del hardware del dispositivo (`react-native-keychain` o `expo-secure-store`).

## Manejo de Archivos Binarios (Imágenes/Audio)

Para cumplir con la arquitectura Zero-Knowledge sin degradar el rendimiento:
* **PROHIBIDO almacenar imágenes en base64 en la base de datos:** Esto colapsa la memoria RAM y bloquea WatermelonDB.
* **Flujo de Cifrado de Archivos:**
  1. El usuario selecciona la imagen desde `expo-image-picker`.
  2. Lee el archivo como bytes/buffer (o en trozos si la API lo permite).
  3. Cifra el buffer usando la clave simétrica derivada (vía `react-native-aes-crypto` o similar de forma nativa).
  4. Guarda el archivo resultante encriptado (ej. `.enc` o `.png.enc`) en `expo-file-system` (`FileSystem.documentDirectory`).
  5. Registra la ruta local del archivo encriptado en WatermelonDB.
* **Flujo de Descifrado de Archivos:**
  1. Al abrir la nota segura, lee los bytes cifrados desde el sistema de archivos.
  2. Descifra los bytes en memoria.
  3. Convierte los bytes descifrados a un URI temporal de base64 o blob local para alimentar el componente de imagen, asegurando limpiar la caché temporal al cerrar la nota.

## Patrones de Código

### 1. Mocking de Keychain en Entornos de Desarrollo (Expo Go)
Dado que `react-native-keychain` no funciona en Expo Go, utiliza siempre el helper de abstracción que delega en memoria o en `SecureStore` (si está disponible) cuando corra bajo Expo Go:

```typescript
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const saveMasterKey = async (key: string) => {
  if (Constants.appOwnership === 'expo') {
    // Desarrollo (Expo Go): Usar almacenamiento simulado o SecureStore de expo
    await SecureStore.setItemAsync('master_key_dev', key);
  } else {
    // Standalone (EAS / Native): Usar Keychain por hardware
    const Keychain = require('react-native-keychain');
    await Keychain.setGenericPassword('user_master_key', key, {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE
    });
  }
};
```

### 2. Evitar el Bloqueo del Hilo de UI
La encriptación de archivos grandes debe ejecutarse de manera asíncrona mediante llamadas nativas (que corren en sus propios hilos de C++/Java/Obj-C) o mediante chunks para evitar congelar la renderización.

* **Ejemplo correcto:**
```typescript
import NativeCrypto from 'react-native-aes-crypto'; // Módulo nativo, corre fuera de JS thread

export const encryptFile = async (fileUri: string, key: string, iv: string): Promise<string> => {
  // Las llamadas nativas a archivos procesan los bytes del lado nativo sin saturar el puente de JS
  return await NativeCrypto.encryptFile(fileUri, key, iv);
};
```

## Errores Comunes a Evitar

* **Hardcodear Sales o IVs:** El vector de inicialización (IV) de AES debe ser único y pseudoaleatorio para cada operación de cifrado. Guardalo junto al archivo o la nota.
* **No limpiar buffers de memoria:** Limpia las variables de texto plano tan pronto como termine la operación criptográfica.
