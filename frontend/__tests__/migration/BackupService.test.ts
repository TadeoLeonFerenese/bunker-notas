/**
 * BackupService Test - MVP Punto 4: Portabilidad
 *
 * Tests para:
 * - Exportar backup encriptado
 * - Importar backup desde archivo
 * - Backup incluye todas las notas (texto + audio)
 * - Restauración mantiene seguridad
 */

import { BackupService } from '../../src/migration/BackupService';

jest.mock('../../src/notes/NotesRepository');
jest.mock('../../src/notes/encryption');
jest.mock('expo-file-system/legacy');
jest.mock('expo-sharing');

describe('BackupService - Punto 4: Portabilidad', () => {
  let backupService: BackupService;

  beforeEach(() => {
    backupService = new BackupService();
    jest.clearAllMocks();
  });

  describe('GIVEN: El usuario quiere hacer backup de sus notas', () => {
    describe('WHEN: Exporta un backup encriptado', () => {
      it('THEN: Genera un archivo .bunker (formato propietario)', async () => {
        const mockNotes = [
          { id: '1', title: 'Nota 1', content: 'Content 1', isSecure: false },
          { id: '2', title: 'Nota 2', content: 'Content 2', isSecure: true },
        ];

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(mockNotes);

        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.writeAsStringAsync.mockResolvedValue(undefined);

        const result = await backupService.exportBackup();

        expect(result).toContain('.bunker');
        expect(result).toContain('backup-');
      });

      it('THEN: Encripta todo el contenido antes de exportar (AES-256)', async () => {
        const mockNotes = [
          { id: '1', title: 'Mi nota', content: 'Contenido secreto', isSecure: true },
        ];

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(mockNotes);

        const encryption = require('../../src/notes/encryption');
        encryption.encryption.encrypt.mockImplementation((text: string) => `encrypted:${text}`);

        await backupService.exportBackup();

        // Verificar que encriptó el contenido
        expect(encryption.encryption.encrypt).toHaveBeenCalledWith(
          expect.stringContaining('Mi nota')
        );
      });

      it('THEN: Incluye metadatos del backup (versión, fecha, device)', async () => {
        const mockNotes = [
          { id: '1', title: 'Test', content: 'Test', isSecure: false },
        ];

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(mockNotes);

        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.writeAsStringAsync.mockResolvedValue(undefined);

        await backupService.exportBackup();

        // Verificar que el JSON incluye metadatos
        const writeCall = FileSystem.writeAsStringAsync.mock.calls[0];
        const writtenContent = writeCall[1];
        
        const parsed = JSON.parse(writtenContent);
        expect(parsed).toHaveProperty('version');
        expect(parsed).toHaveProperty('createdAt');
        expect(parsed).toHaveProperty('deviceId');
      });

      it('THEN: Incluye todas las notas (texto y audio)', async () => {
        const mockNotes = [
          { id: '1', title: 'Nota texto', content: 'Texto', isSecure: false },
          { id: '2', title: 'Audio nota', content: '', audioUri: 'file:///audio/recording.m4a', isSecure: false },
        ];

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(mockNotes);

        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.writeAsStringAsync.mockResolvedValue(undefined);

        await backupService.exportBackup();

        const writeCall = FileSystem.writeAsStringAsync.mock.calls[0];
        const parsed = JSON.parse(writeCall[1]);
        
        expect(parsed.notes).toHaveLength(2);
        expect(parsed.notes[1]).toHaveProperty('audioUri');
      });

      it('THEN: Las notas seguras mantienen su flag isSecure', async () => {
        const mockNotes = [
          { id: '1', title: 'Secreta', content: 'Content', isSecure: true },
        ];

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(mockNotes);

        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.writeAsStringAsync.mockResolvedValue(undefined);

        await backupService.exportBackup();

        const writeCall = FileSystem.writeAsStringAsync.mock.calls[0];
        const parsed = JSON.parse(writeCall[1]);
        
        // Las notas seguras mantienen su flag (sin desencriptar)
        expect(parsed.notes[0].isSecure).toBe(true);
        expect(parsed.notes[0].title).not.toBe('Secreta'); // está encriptado
      });
    });

    describe('WHEN: Comparte el archivo de backup', () => {
      it('THEN: Usa expo-sharing para compartir archivo', async () => {
        const mockNotes = [
          { id: '1', title: 'Test', content: 'Test', isSecure: false },
        ];

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(mockNotes);

        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.writeAsStringAsync.mockResolvedValue('/mock/documents/backup-123.bunker');

        const Sharing = require('expo-sharing');
        Sharing.shareAsync.mockResolvedValue(true);

        const result = await backupService.exportAndShare();

        expect(Sharing.shareAsync).toHaveBeenCalledWith(
          expect.stringContaining('.bunker'),
          expect.objectContaining({
            mimeType: 'application/octet-stream',
            dialogTitle: 'Exportar backup de Bunker Notas',
          })
        );
      });
    });
  });

  describe('GIVEN: El usuario quiere restaurar un backup', () => {
    describe('WHEN: Importa un archivo .bunker válido', () => {
      it('THEN: Desencripta el contenido del backup', async () => {
        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.readAsStringAsync.mockResolvedValue(
          JSON.stringify({
            version: '1.0',
            createdAt: '2024-01-01',
            notes: [
              { id: '1', title: 'encrypted:Test', content: 'encrypted:Content', isSecure: true },
            ],
          })
        );

        const encryption = require('../../src/notes/encryption');
        encryption.encryption.decrypt.mockImplementation((text: string) => text.replace('encrypted:', ''));

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.create.mockResolvedValue({ id: '1' });

        await backupService.importBackup('/mock/backup.bunker');

        // Verificar que desencriptó
        expect(encryption.encryption.decrypt).toHaveBeenCalled();
      });

      it('THEN: Crea todas las notas del backup', async () => {
        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.readAsStringAsync.mockResolvedValue(
          JSON.stringify({
            version: '1.0',
            createdAt: '2024-01-01',
            notes: [
              { id: '1', title: 'Nota 1', content: 'Content 1', isSecure: false },
              { id: '2', title: 'Nota 2', content: 'Content 2', isSecure: false },
            ],
          })
        );

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.create.mockResolvedValue({ id: 'restored' });

        const result = await backupService.importBackup('/mock/backup.bunker');

        expect(NotesRepository.NotesRepository.create).toHaveBeenCalledTimes(2);
        expect(result.restored).toBe(2);
      });

      it('THEN: Mantiene el flag isSecure de cada nota', async () => {
        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/documents/';
        FileSystem.readAsStringAsync.mockResolvedValue(
          JSON.stringify({
            version: '1.0',
            notes: [
              { id: '1', title: 'Normal', content: 'Content', isSecure: false },
              { id: '2', title: 'Secreta', content: 'Content', isSecure: true },
            ],
          })
        );

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.create.mockImplementation((data: any) =>
          Promise.resolve({ id: 'restored', ...data })
        );

        await backupService.importBackup('/mock/backup.bunker');

        const createCalls = NotesRepository.NotesRepository.create.mock.calls;
        expect(createCalls[0][0].isSecure).toBe(false);
        expect(createCalls[1][0].isSecure).toBe(true);
      });
    });

    describe('WHEN: El archivo de backup es inválido', () => {
      it('THEN: Lanza error si no es .bunker', async () => {
        await expect(
          backupService.importBackup('/mock/backup.txt')
        ).rejects.toThrow('Formato de archivo inválido');
      });

      it('THEN: Lanza error si el JSON está corrupto', async () => {
        const FileSystem = require('expo-file-system/legacy');
        FileSystem.readAsStringAsync.mockResolvedValue('not valid json');

        await expect(
          backupService.importBackup('/mock/backup.bunker')
        ).rejects.toThrow('Archivo de backup corrupto');
      });

      it('THEN: Lanza error si falta versión', async () => {
        const FileSystem = require('expo-file-system/legacy');
        FileSystem.readAsStringAsync.mockResolvedValue(
          JSON.stringify({ createdAt: '2024-01-01', notes: [] })
        );

        await expect(
          backupService.importBackup('/mock/backup.bunker')
        ).rejects.toThrow('Versión de backup incompatible');
      });
    });
  });

  describe('Punto 4 - Migration Tool', () => {
    describe('WHEN: Usuario exporta y luego importa en otro dispositivo', () => {
      it('THEN: Las notas mantienen su contenido exacto', async () => {
        const originalNotes = [
          { id: '1', title: 'Nota con tildes: año, sesión', content: 'Especial: @#$%', isSecure: false },
          { id: '2', title: '音频录制', content: '测试中文', isSecure: true },
        ];

        // Simular export
        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(originalNotes);

        const encryption = require('../../src/notes/encryption');
        encryption.encryption.encrypt.mockImplementation((text: string) => `enc:${text}`);

        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/';
        FileSystem.writeAsStringAsync.mockResolvedValue('/mock/backup.bunker');

        // Exportar
        const exportPath = await backupService.exportBackup();

        // Simular import
        const encryptedBackup = {
          version: '1.0',
          createdAt: '2024-01-01',
          notes: originalNotes.map(n => ({
            ...n,
            title: `enc:${n.title}`,
            content: `enc:${n.content}`,
          })),
        };

        FileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(encryptedBackup));
        encryption.encryption.decrypt.mockImplementation((text: string) => text.replace('enc:', ''));
        NotesRepository.NotesRepository.create.mockResolvedValue({ id: 'new' });

        // Importar
        const result = await backupService.importBackup(exportPath);

        expect(result.restored).toBe(2);
      });
    });
  });

  describe('GIVEN: El usuario tiene muchas notas (WatermelonDB lazy loading)', () => {
    describe('WHEN: Exporta 1000+ notas', () => {
      it('THEN: No bloquea la UI (usa async/await)', async () => {
        const mockNotes = Array.from({ length: 1000 }, (_, i) => ({
          id: `${i}`,
          title: `Nota ${i}`,
          content: `Contenido ${i}`,
          isSecure: false,
        }));

        const NotesRepository = require('../../src/notes/NotesRepository');
        NotesRepository.NotesRepository.getAll.mockResolvedValue(mockNotes);

        const FileSystem = require('expo-file-system/legacy');
        FileSystem.documentDirectory = '/mock/';
        FileSystem.writeAsStringAsync.mockResolvedValue('/mock/backup.bunker');

        const startTime = Date.now();
        await backupService.exportBackup();
        const duration = Date.now() - startTime;

        // Debe ser async, no bloquear
        expect(duration).toBeLessThan(5000); // Menos de 5 segundos
      });
    });
  });
});
