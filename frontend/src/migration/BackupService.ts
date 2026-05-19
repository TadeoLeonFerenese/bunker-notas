/**
 * BackupService - MVP Punto 4: Portabilidad
 *
 * Implementación de exportación, importación y compartición de backups encriptados.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { NotesRepository } from '../notes/NotesRepository';
import { encryption } from '../notes/encryption';

export interface BackupMetadata {
  version: string;
  createdAt: string;
  deviceId: string;
}

export interface BackupData {
  version: string;
  createdAt: string;
  deviceId: string;
  notes: any[];
}

export interface ImportResult {
  restored: number;
  failed: number;
}

export class BackupService {
  private readonly BACKUP_VERSION = '1.0.0';
  private readonly BACKUP_PREFIX = 'backup-';
  private readonly BACKUP_EXTENSION = '.bunker';

  /**
   * Exporta todas las notas a un archivo encriptado .bunker
   */
  async exportBackup(): Promise<string> {
    const notes = await NotesRepository.getAll();
    const deviceId = await this.getDeviceId();

    // Encriptar notas
    const encryptedNotes = notes.map(note => ({
      id: note.id,
      title: note.isSecure ? encryption.encrypt(note.title) : note.title,
      content: note.isSecure && note.content ? encryption.encrypt(note.content) : note.content,
      isSecure: note.isSecure,
      isMarked: note.isMarked,
      audioUri: note.audioUri || '',
    }));

    const backupData: BackupData = {
      version: this.BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      deviceId,
      notes: encryptedNotes,
    };

    const backupDir = FileSystem.documentDirectory || '/mock/documents/';
    const filename = `${this.BACKUP_PREFIX}${Date.now()}${this.BACKUP_EXTENSION}`;
    const filePath = `${backupDir}${filename}`;

    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData));

    console.log('📦 Backup exportado con éxito en:', filePath);
    return filePath;
  }

  /**
   * Exporta el backup y lo comparte usando la API nativa de compartir de Expo
   */
  async exportAndShare(): Promise<string> {
    const path = await this.exportBackup();
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Exportar backup de Bunker Notas',
      });
    }

    return path;
  }

  /**
   * Importa y restaura notas desde un archivo .bunker
   */
  async importBackup(filePath: string): Promise<ImportResult> {
    if (!filePath.endsWith(this.BACKUP_EXTENSION)) {
      throw new Error('Formato de archivo inválido');
    }

    let fileContent: string;
    try {
      fileContent = await FileSystem.readAsStringAsync(filePath);
    } catch (err) {
      throw new Error('Archivo de backup corrupto');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(fileContent);
    } catch (err) {
      throw new Error('Archivo de backup corrupto');
    }

    if (!parsed.version && (!parsed.metadata || !parsed.metadata.version)) {
      throw new Error('Versión de backup incompatible');
    }

    const notesToRestore = parsed.notes || [];
    let restoredCount = 0;

    for (const noteData of notesToRestore) {
      const decryptedNote = {
        title: noteData.isSecure && noteData.title ? encryption.decrypt(noteData.title) : noteData.title,
        content: noteData.isSecure && noteData.content ? encryption.decrypt(noteData.content) : noteData.content,
        isSecure: !!noteData.isSecure,
        isMarked: !!noteData.isMarked,
        audioUri: noteData.audioUri || '',
      };

      await NotesRepository.create(decryptedNote);
      restoredCount++;
    }

    return { restored: restoredCount, failed: 0 };
  }

  private async getDeviceId(): Promise<string> {
    return `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  async listBackups(): Promise<string[]> {
    return [];
  }

  async deleteBackup(_filePath: string): Promise<boolean> {
    return false;
  }
}

export const backupService = new BackupService();