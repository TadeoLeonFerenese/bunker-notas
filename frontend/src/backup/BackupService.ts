import { database } from '../database';
import Note from '../database/Note';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

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
        newNote._raw.created_at = noteData.createdAt;
      }
      if (noteData.updatedAt) {
        newNote._raw.updated_at = noteData.updatedAt;
      }
      batchOps.push(newNote);
      imported++;
    }

    await database.write(async () => {
      await database.batch(...batchOps);
    });
    return imported;
  },
};
