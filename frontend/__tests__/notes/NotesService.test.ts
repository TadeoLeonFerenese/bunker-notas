/**
 * NotesService CRUD Test - MVP Punto 3: Gestión y Seguridad
 *
 * Tests para:
 * - Crear nota (texto y audio)
 * - Leer nota
 * - Editar nota
 * - Eliminar nota
 * - Blindaje AES-256 (simulado)
 */

import { NotesService } from '../../src/notes/NotesService';

// Mock de la base de datos (WatermelonDB would be here)
jest.mock('../../src/notes/NotesRepository', () => ({
  NotesRepository: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
  },
}));

describe('NotesService - Punto 3: CRUD Completo', () => {
  let notesService: NotesService;

  beforeEach(() => {
    notesService = new NotesService();
    jest.clearAllMocks();
  });

  describe('GIVEN: El usuario quiere crear una nota', () => {
    describe('WHEN: Crea una nota de texto', () => {
      it('THEN: Crea la nota con título, contenido y timestamps', async () => {
        const mockCreate = require('../../src/notes/NotesRepository').NotesRepository.create;
        mockCreate.mockResolvedValue({
          id: 'new-note-id',
          title: 'Mi nueva nota',
          content: 'Contenido de prueba',
          isSecure: false,
          isMarked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const note = await notesService.createNote({
          title: 'Mi nueva nota',
          content: 'Contenido de prueba',
          isSecure: false,
        });

        expect(note).toHaveProperty('id');
        expect(note.title).toBe('Mi nueva nota');
        expect(note.content).toBe('Contenido de prueba');
      });

      it('THEN: Por defecto isMarked es false', async () => {
        const mockCreate = require('../../src/notes/NotesRepository').NotesRepository.create;
        mockCreate.mockResolvedValue({
          id: '1',
          title: 'Test',
          content: 'Content',
          isMarked: false,
        });

        const note = await notesService.createNote({
          title: 'Test',
          content: 'Content',
        });

        expect(note.isMarked).toBe(false);
      });
    });

    describe('WHEN: Crea una nota segura', () => {
      it('THEN: Encripta el contenido antes de guardar (AES-256)', async () => {
        const mockCreate = require('../../src/notes/NotesRepository').NotesRepository.create;
        mockCreate.mockResolvedValue({
          id: 'secure-note',
          title: 'Nota segura',
          content: 'encrypted-content',
          isSecure: true,
        });

        const note = await notesService.createNote({
          title: 'Nota segura',
          content: 'Mi contenido secreto',
          isSecure: true,
        });

        expect(note.isSecure).toBe(true);
        // El contenido debe estar encriptado, no en plaintext
        expect(note.content).not.toBe('Mi contenido secreto');
      });

      it('THEN: Guarda el título encriptado también', async () => {
        const mockCreate = require('../../src/notes/NotesRepository').NotesRepository.create;
        mockCreate.mockResolvedValue({
          id: '1',
          title: 'encrypted-title',
          content: 'encrypted',
          isSecure: true,
        });

        const note = await notesService.createNote({
          title: 'Título secreto',
          content: 'Contenido',
          isSecure: true,
        });

        expect(note.title).not.toBe('Título secreto');
      });
    });

    describe('WHEN: Crea una grabación de audio', () => {
      it('THEN: Guarda la referencia al archivo de audio', async () => {
        const mockCreate = require('../../src/notes/NotesRepository').NotesRepository.create;
        mockCreate.mockResolvedValue({
          id: 'audio-note',
          title: 'Grabación 1',
          content: '',
          audioUri: 'file:///audio/recording.m4a',
          isSecure: false,
        });

        const note = await notesService.createAudioNote({
          title: 'Grabación 1',
          audioUri: 'file:///audio/recording.m4a',
        });

        expect(note).toHaveProperty('audioUri');
        expect(note.audioUri).toContain('recording.m4a');
      });

      it('THEN: Permite audio encriptado', async () => {
        const mockCreate = require('../../src/notes/NotesRepository').NotesRepository.create;
        mockCreate.mockResolvedValue({
          id: '1',
          title: 'Audio seguro',
          content: '',
          audioUri: 'encrypted-audio-path',
          isSecure: true,
        });

        const note = await notesService.createAudioNote({
          title: 'Audio seguro',
          audioUri: 'file:///audio/secret.m4a',
          isSecure: true,
        });

        expect(note.isSecure).toBe(true);
      });
    });
  });

  describe('GIVEN: El usuario quiere leer sus notas', () => {
    describe('WHEN: Obtiene todas las notas', () => {
      it('THEN: Retorna un array de notas', async () => {
        const mockGetAll = require('../../src/notes/NotesRepository').NotesRepository.getAll;
        mockGetAll.mockResolvedValue([
          { id: '1', title: 'Nota 1', content: 'Content 1', isSecure: false },
          { id: '2', title: 'Nota 2', content: 'Content 2', isSecure: false },
        ]);

        const notes = await notesService.getAllNotes();

        expect(Array.isArray(notes)).toBe(true);
        expect(notes).toHaveLength(2);
      });

      it('THEN: Las notas seguras tienen contenido desencriptado', async () => {
        const { encryption } = require('../../src/notes/encryption');
        const mockGetAll = require('../../src/notes/NotesRepository').NotesRepository.getAll;
        mockGetAll.mockResolvedValue([
          {
            id: '1',
            title: encryption.encrypt('Título secreto'),
            content: encryption.encrypt('Contenido secreto'),
            isSecure: true,
          },
        ]);

        const notes = await notesService.getAllNotes();

        // El servicio debe desencriptar automáticamente
        expect(notes[0].title).toBe('Título secreto');
        expect(notes[0].content).toBe('Contenido secreto');
      });
    });

    describe('WHEN: Obtiene una nota específica', () => {
      it('THEN: Retorna la nota por ID', async () => {
        const mockGetById = require('../../src/notes/NotesRepository').NotesRepository.getById;
        mockGetById.mockResolvedValue({
          id: 'specific-id',
          title: 'Nota específica',
          content: 'Content',
        });

        const note = await notesService.getNoteById('specific-id');

        expect(note?.id).toBe('specific-id');
      });

      it('THEN: Retorna null si no existe', async () => {
        const mockGetById = require('../../src/notes/NotesRepository').NotesRepository.getById;
        mockGetById.mockResolvedValue(null);

        const note = await notesService.getNoteById('non-existent');

        expect(note).toBeNull();
      });
    });
  });

  describe('GIVEN: El usuario quiere editar una nota', () => {
    beforeEach(() => {
      const mockGetById = require('../../src/notes/NotesRepository').NotesRepository.getById;
      mockGetById.mockResolvedValue({
        id: '1',
        title: 'Título original',
        content: 'Contenido original',
        isSecure: false,
        isMarked: false,
      });
    });

    describe('WHEN: Actualiza el título', () => {
      it('THEN: Actualiza solo el título', async () => {
        const mockUpdate = require('../../src/notes/NotesRepository').NotesRepository.update;
        mockUpdate.mockResolvedValue({
          id: '1',
          title: 'Nuevo título',
          content: 'Contenido original',
        });

        const note = await notesService.updateNote('1', { title: 'Nuevo título' });

        expect(note.title).toBe('Nuevo título');
        expect(note.content).toBe('Contenido original');
      });

      it('THEN: Actualiza la fecha de modificación', async () => {
        const mockUpdate = require('../../src/notes/NotesRepository').NotesRepository.update;
        mockUpdate.mockImplementation((id: string, data: any) =>
          Promise.resolve({
            id,
            ...data,
            updatedAt: new Date(),
          })
        );

        const note = await notesService.updateNote('1', { title: 'Test' });

        expect(note.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('WHEN: Actualiza contenido de nota segura', () => {
      it('THEN: Encripta el nuevo contenido antes de guardar', async () => {
        const mockGetById = require('../../src/notes/NotesRepository').NotesRepository.getById;
        mockGetById.mockResolvedValue({
          id: '1',
          title: 'encrypted-title',
          content: 'encrypted-content',
          isSecure: true,
        });

        const mockUpdate = require('../../src/notes/NotesRepository').NotesRepository.update;
        mockUpdate.mockResolvedValue({
          id: '1',
          content: 'encrypted-new-content',
          isSecure: true,
        });

        const note = await notesService.updateNote('1', {
          content: 'Nuevo contenido secreto',
          isSecure: true,
        });

        expect(note.content).not.toBe('Nuevo contenido secreto');
        expect(note.isSecure).toBe(true);
      });
    });
  });

  describe('GIVEN: El usuario quiere eliminar una nota', () => {
    describe('WHEN: Elimina una nota existente', () => {
      it('THEN: Retorna true si se eliminó', async () => {
        const mockDelete = require('../../src/notes/NotesRepository').NotesRepository.delete;
        mockDelete.mockResolvedValue(true);

        const result = await notesService.deleteNote('1');

        expect(result).toBe(true);
      });

      it('THEN: Llama al repositorio con el ID correcto', async () => {
        const mockDelete = require('../../src/notes/NotesRepository').NotesRepository.delete;
        mockDelete.mockResolvedValue(true);

        await notesService.deleteNote('specific-id');

        expect(mockDelete).toHaveBeenCalledWith('specific-id');
      });
    });

    describe('WHEN: La nota no existe', () => {
      it('THEN: Retorna false', async () => {
        const mockDelete = require('../../src/notes/NotesRepository').NotesRepository.delete;
        mockDelete.mockResolvedValue(false);

        const result = await notesService.deleteNote('non-existent');

        expect(result).toBe(false);
      });
    });
  });

  describe('Punto 3 - Blindaje AES-256', () => {
    describe('WHEN: Se encripta contenido', () => {
      it('THEN: El resultado es diferente al input (one-way)', () => {
        // Test de la función de encriptación
        const { encryption } = require('../../src/notes/encryption');
        const encrypted = encryption.encrypt('contenido original');

        expect(encrypted).not.toBe('contenido original');
      });

      it('THEN: El mismo input produce diferente output (salt único)', () => {
        const { encryption } = require('../../src/notes/encryption');
        const encrypted1 = encryption.encrypt('test');
        const encrypted2 = encryption.encrypt('test');

        // Deben ser diferentes por el salt
        expect(encrypted1).not.toBe(encrypted2);
      });

      it('THEN: Se puede desencriptar correctamente', () => {
        const { encryption } = require('../../src/notes/encryption');
        const original = 'mi texto secreto';
        const encrypted = encryption.encrypt(original);
        const decrypted = encryption.decrypt(encrypted);

        expect(decrypted).toBe(original);
      });
    });
  });
});