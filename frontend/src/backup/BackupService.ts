import { database } from '../database';
import Note from '../database/Note';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { encryption } from '../notes/encryption';
import { GoogleDriveService } from './GoogleDriveService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BackupNote {
  title: string;
  content: string;
  isSecure: boolean;
  isMarked: boolean;
  audioUri?: string;
  color?: string;
  illustration?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupData {
  app: string;
  version: string;
  exportedAt: string;
  notes: BackupNote[];
}

export const backupService = {
  async exportNotes(): Promise<string> {
    const notes = await database.collections.get<Note>('notes').query().fetch();

    const backupData: BackupData = {
      app: 'Bunker Notas',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      notes: notes.map(n => {
        const raw = n as any;
        return {
          title: n.title,
          content: n.content,
          isSecure: n.isSecure,
          isMarked: n.isMarked,
          audioUri: raw.audioUri || undefined,
          color: raw.color || undefined,
          illustration: raw.illustration || undefined,
          createdAt: new Date(raw.createdAt).getTime(),
          updatedAt: new Date(raw.updatedAt).getTime(),
        };
      }),
    };

    const json = JSON.stringify(backupData, null, 2);
    const filename = `bunker-backup-${Date.now()}.bunker`;
    const path = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(path, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return path;
  },

  async shareBackup(path: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Compartir archivos no está disponible en este dispositivo');
    }
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Compartir respaldo de Bunker Notas',
      UTI: 'public.json',
    });
  },

  async pickAndImport(): Promise<number> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return 0;
    }

    const uri = result.assets[0].uri;
    const json = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const data: BackupData = JSON.parse(json);

    return this.importBackupData(data);
  },

  /**
   * Genera el payload cifrado del backup para subir a Google Drive
   */
  async exportEncryptedBackup(): Promise<string> {
    const notes = await database.collections.get<Note>('notes').query().fetch();

    const backupData: BackupData = {
      app: 'Bunker Notas',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      notes: notes.map(n => {
        const raw = n as any;
        return {
          title: n.title,
          content: n.content,
          isSecure: n.isSecure,
          isMarked: n.isMarked,
          audioUri: raw.audioUri || undefined,
          color: raw.color || undefined,
          illustration: raw.illustration || undefined,
          createdAt: new Date(raw.createdAt).getTime(),
          updatedAt: new Date(raw.updatedAt).getTime(),
        };
      }),
    };

    const json = JSON.stringify(backupData);
    // Ciframos con AES-256 Zero-Knowledge
    return encryption.encrypt(json);
  },

  /**
   * Importa las notas desde el payload cifrado descargado de Google Drive
   */
  async importEncryptedBackup(encryptedData: string): Promise<number> {
    const decrypted = encryption.decrypt(encryptedData);
    if (!decrypted) {
      throw new Error('No se pudo descifrar la copia de seguridad. Verificá que el PIN sea correcto.');
    }

    const data: BackupData = JSON.parse(decrypted);
    return this.importBackupData(data);
  },

  /**
   * Procesa la inserción de las notas en WatermelonDB
   */
  async importBackupData(data: BackupData): Promise<number> {
    if (!data.app || !data.version || !Array.isArray(data.notes)) {
      throw new Error('El archivo no es un respaldo válido de Bunker Notas');
    }

    let imported = 0;
    const batchOps: any[] = [];
    
    for (const noteData of data.notes) {
      const rawNote = {
        title: noteData.title,
        content: noteData.content,
        is_secure: noteData.isSecure,
        is_marked: noteData.isMarked,
        audio_uri: noteData.audioUri || '',
        color: noteData.color || 'default',
        illustration: noteData.illustration || 'none',
        created_at: noteData.createdAt || Date.now(),
        updated_at: noteData.updatedAt || Date.now(),
      };
      
      const newNote = database.collections.get<Note>('notes').prepareCreateFromDirtyRaw(rawNote);
      if (noteData.createdAt) {
        (newNote._raw as any).created_at = noteData.createdAt;
      }
      if (noteData.updatedAt) {
        (newNote._raw as any).updated_at = noteData.updatedAt;
      }
      batchOps.push(newNote);
      imported++;
    }

    await database.write(async () => {
      await database.batch(...batchOps);
    });
    return imported;
  },

  /**
   * Sincroniza archivos multimedia (audios) con Google Drive de manera incremental
   */
  async syncMultimediaToDrive(includeMedia: boolean, onProgress?: (msg: string) => void): Promise<void> {
    if (!includeMedia) return;

    const notes = await database.collections.get<Note>('notes').query().fetch();
    const uploadedMediaStr = await AsyncStorage.getItem('@bunker_uploaded_media') || '{}';
    const uploadedMedia: Record<string, boolean> = JSON.parse(uploadedMediaStr);

    for (const note of notes) {
      const audioUri = note.audioUri;
      if (!audioUri) continue;

      // Obtener el nombre del archivo (basename)
      const filename = audioUri.substring(audioUri.lastIndexOf('/') + 1);
      
      // Si ya fue subido en esta sesión o anteriormente, lo salteamos
      if (uploadedMedia[filename]) {
        continue;
      }

      try {
        const info = await FileSystem.getInfoAsync(audioUri);
        if (!info.exists) {
          console.warn(`[Backup Service] El archivo de audio no existe en el disco: ${audioUri}`);
          continue;
        }

        if (onProgress) {
          onProgress(`Subiendo multimedia: ${note.title || 'Nota sin título'}`);
        }

        let fileContent = '';
        if (note.isSecure && audioUri.endsWith('.enc')) {
          // El archivo ya está cifrado localmente, lo leemos como texto plano para subir el ciphertext
          fileContent = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        } else {
          // Nota normal o archivo no cifrado, lo leemos en base64 y lo encriptamos al subirlo para que en Drive esté seguro
          const base64 = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileContent = encryption.encrypt(base64);
        }

        // Subimos a Drive
        await GoogleDriveService.uploadFile(`media_${filename}`, fileContent);
        
        // Registramos como subido
        uploadedMedia[filename] = true;
        await AsyncStorage.setItem('@bunker_uploaded_media', JSON.stringify(uploadedMedia));
      } catch (err: any) {
        console.error(`[Backup Service] Error al subir multimedia ${filename}:`, err);
      }
    }
  },

  /**
   * Descarga de Google Drive los archivos multimedia (audios) asociados a las notas importadas
   */
  async downloadMultimediaFromDrive(notes: BackupNote[], onProgress?: (msg: string) => void): Promise<void> {
    const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;

    for (const note of notes) {
      const audioUri = note.audioUri;
      if (!audioUri) continue;

      const filename = audioUri.substring(audioUri.lastIndexOf('/') + 1);
      const localUri = `${documentDir}${filename}`;

      try {
        const info = await FileSystem.getInfoAsync(localUri);
        // Si ya existe localmente, no lo volvemos a descargar
        if (info.exists) {
          continue;
        }

        if (onProgress) {
          onProgress(`Descargando multimedia: ${note.title || 'Nota sin título'}`);
        }

        // Descargamos el archivo cifrado de Drive
        const encryptedContent = await GoogleDriveService.downloadFile(`media_${filename}`);
        
        if (note.isSecure && filename.endsWith('.enc')) {
          // Si es seguro, se escribe directamente como string (ciphertext) a disco
          await FileSystem.writeAsStringAsync(localUri, encryptedContent, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        } else {
          // Si no es seguro en disco pero estaba encriptado en Drive, lo desencriptamos y escribimos como Base64
          const base64 = encryption.decrypt(encryptedContent);
          await FileSystem.writeAsStringAsync(localUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        // Actualizamos la nota localmente con la nueva URI correspondiente a este dispositivo
        const dbNotes = await database.collections.get<Note>('notes').query().fetch();
        // Buscamos la nota correspondiente en la base de datos local y le actualizamos la URI
        const dbNote = dbNotes.find(n => n.title === note.title && n.createdAt.getTime() === note.createdAt);
        if (dbNote) {
          await database.write(async () => {
            await dbNote.update(n => {
              n.audioUri = localUri;
            });
          });
        }
      } catch (err: any) {
        console.warn(`[Backup Service] Error al descargar multimedia ${filename} de Drive:`, err);
      }
    }
  },
};
