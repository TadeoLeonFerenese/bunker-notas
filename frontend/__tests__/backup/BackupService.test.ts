import { backupService, BackupData } from '../../src/backup/BackupService';
import { database } from '../../src/database';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock-cache/',
  documentDirectory: 'file:///mock-documents/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(JSON.stringify({
    app: 'Bunker Notas',
    version: '1.0.0',
    exportedAt: '2026-05-26T12:00:00.000Z',
    notes: [
      {
        title: 'Nota pública',
        content: 'Contenido visible',
        isSecure: false,
        isMarked: true,
        createdAt: 1710000000000,
        updatedAt: 1710000000000,
      },
      {
        title: 'Nota secreta',
        content: 'iv:salt:encrypted-content',
        isSecure: true,
        isMarked: false,
        color: 'red',
        illustration: 'lock',
        createdAt: 1710000000000,
        updatedAt: 1710000000000,
      },
    ],
  })),
  EncodingType: { UTF8: 'utf8' },
  getInfoAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///mock-import.bunker' }],
  }),
}));

describe('BackupService - MVP Punto 4: Portabilidad', () => {
  beforeEach(async () => {
    await database.write(async () => {
      await database.collections.get('notes').create((n: any) => {
        n.title = 'Test note';
        n.content = 'Test content';
        n.isSecure = false;
        n.isMarked = false;
      });
    });
  });

  afterEach(async () => {
    const all = await database.collections.get('notes').query().fetch();
    await database.write(async () => {
      for (const n of all) {
        await n.destroyPermanently();
      }
    });
  });

  it('should export notes and return a file path', async () => {
    const path = await backupService.exportNotes();
    expect(path).toMatch(/\.bunker$/);
    expect(path).toContain('file:///mock-cache/');
  });

  it('should share the exported file', async () => {
    const path = await backupService.exportNotes();
    await expect(backupService.shareBackup(path)).resolves.not.toThrow();
  });

  it('should throw if sharing is not available', async () => {
    const mockSharing = require('expo-sharing');
    mockSharing.isAvailableAsync.mockResolvedValueOnce(false);

    await expect(backupService.shareBackup('/fake/path.bunker')).rejects.toThrow(
      'Compartir archivos no está disponible en este dispositivo'
    );
  });

  it('should pick and import notes from a file', async () => {
    const count = await backupService.pickAndImport();
    expect(count).toBe(2);
  });

  it('should return 0 if document picker is canceled', async () => {
    const mockPicker = require('expo-document-picker');
    mockPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    const count = await backupService.pickAndImport();
    expect(count).toBe(0);
  });

  it('should throw error for invalid backup file', async () => {
    const mockFS = require('expo-file-system/legacy');
    mockFS.readAsStringAsync.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));

    await expect(backupService.pickAndImport()).rejects.toThrow(
      'El archivo no es un respaldo válido de Bunker Notas'
    );
  });

  it('should import secure notes with ciphertext preserved', async () => {
    const mockFS = require('expo-file-system/legacy');
    mockFS.readAsStringAsync.mockResolvedValueOnce(JSON.stringify({
      app: 'Bunker Notas',
      version: '1.0.0',
      exportedAt: '2026-05-26T12:00:00.000Z',
      notes: [
        {
          title: 'Secure',
          content: 'iv:salt:encrypted-value',
          isSecure: true,
          isMarked: false,
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
      ],
    }));

    await backupService.pickAndImport();

    const all = await database.collections.get('notes').query().fetch();
    const secure = all.find(n => (n as any).isSecure) as any;
    expect(secure).toBeDefined();
    expect(secure.title).toBe('Secure');
    expect(secure.content).toBe('iv:salt:encrypted-value');
  });

  it('should export correct JSON structure', async () => {
    const mockFS = require('expo-file-system/legacy');
    let writtenJson = '';
    mockFS.writeAsStringAsync.mockImplementation(async (_: string, json: string) => {
      writtenJson = json;
    });

    await backupService.exportNotes();

    const parsed: BackupData = JSON.parse(writtenJson);
    expect(parsed.app).toBe('Bunker Notas');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.notes.length).toBeGreaterThanOrEqual(1);
    expect(parsed.notes[0]).toHaveProperty('title');
    expect(parsed.notes[0]).toHaveProperty('content');
    expect(parsed.notes[0]).toHaveProperty('isSecure');
  });
});
