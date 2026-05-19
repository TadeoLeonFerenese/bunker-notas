/**
 * NotesService - Lógica de negocio para notas
 *
 * Maneja:
 * - CRUD de notas
 * - Encriptación/desencriptación de notas seguras
 * - Validaciones
 */

import { Note } from './NoteCard';
import { NotesRepository } from './NotesRepository';
import { encryption } from './encryption';

export interface CreateNoteInput {
  title: string;
  content: string;
  isSecure?: boolean;
  isMarked?: boolean;
  audioUri?: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  isSecure?: boolean;
  isMarked?: boolean;
  audioUri?: string;
}

export class NotesService {
  /**
   * Crea una nueva nota
   */
  async createNote(input: CreateNoteInput): Promise<Note> {
    const { isSecure, ...rest } = input;

    // Si es segura, encriptar contenido
    const processedData = isSecure
      ? {
          ...rest,
          title: encryption.encrypt(rest.title),
          content: encryption.encrypt(rest.content),
          isSecure: true,
        }
      : rest;

    return NotesRepository.create(processedData);
  }

  /**
   * Crea una nota de audio
   */
  async createAudioNote(input: {
    title: string;
    audioUri: string;
    isSecure?: boolean;
  }): Promise<Note> {
    const { isSecure } = input;

    // Encriptar si es segura
    const processedData = isSecure
      ? {
          title: encryption.encrypt(input.title),
          content: '', // El audio se guarda referenciado
          audioUri: isSecure ? encryption.encrypt(input.audioUri) : input.audioUri,
          isSecure: true,
        }
      : {
          title: input.title,
          content: '',
          audioUri: input.audioUri,
          isSecure: false,
        };

    return NotesRepository.create(processedData);
  }

  /**
   * Obtiene todas las notas (desencripta las seguras)
   */
  async getAllNotes(): Promise<Note[]> {
    const notes = await NotesRepository.getAll();

    // Desencriptar notas seguras
    return notes.map(note =>
      note.isSecure
        ? {
            ...note,
            title: encryption.decrypt(note.title),
            content: encryption.decrypt(note.content),
          }
        : note
    );
  }

  /**
   * Obtiene una nota por ID
   */
  async getNoteById(id: string): Promise<Note | null> {
    const note = await NotesRepository.getById(id);

    if (!note) return null;

    // Desencriptar si es segura
    return note.isSecure
      ? {
          ...note,
          title: encryption.decrypt(note.title),
          content: encryption.decrypt(note.content),
        }
      : note;
  }

  /**
   * Actualiza una nota
   */
  async updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
    const existing = await this.getNoteById(id);
    if (!existing) {
      throw new Error('Nota no encontrada');
    }

    const isSecure = input.isSecure ?? existing.isSecure;

    // Encriptar si es segura
    const processedData = isSecure
      ? {
          ...input,
          title: input.title ? encryption.encrypt(input.title) : existing.title,
          content: input.content ? encryption.encrypt(input.content) : existing.content,
          isSecure: true,
        }
      : input;

    return NotesRepository.update(id, processedData);
  }

  /**
   * Elimina una nota
   */
  async deleteNote(id: string): Promise<boolean> {
    return NotesRepository.delete(id);
  }

  /**
   * Toggle marca de nota
   */
  async toggleMark(id: string): Promise<Note> {
    const note = await this.getNoteById(id);
    if (!note) {
      throw new Error('Nota no encontrada');
    }

    return this.updateNote(id, { isMarked: !note.isMarked });
  }
}

// Exportar instancia singleton
export const notesService = new NotesService();