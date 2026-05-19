/**
 * NotesRepository - Capa de acceso a datos
 *
 * En producción, esto se conectaría a WatermelonDB
 * Por ahora es un mock para desarrollo
 */

import { Note } from './NoteCard';

export const NotesRepository = {
  async create(noteData: Partial<Note>): Promise<Note> {
    // TODO: Implementar con WatermelonDB
    return {
      id: `note-${Date.now()}`,
      title: noteData.title || '',
      content: noteData.content || '',
      isSecure: noteData.isSecure || false,
      isMarked: noteData.isMarked || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  async update(id: string, noteData: Partial<Note>): Promise<Note> {
    // TODO: Implementar con WatermelonDB
    return {
      id,
      title: noteData.title || '',
      content: noteData.content || '',
      isSecure: noteData.isSecure || false,
      isMarked: noteData.isMarked || false,
      updatedAt: new Date(),
    };
  },

  async delete(id: string): Promise<boolean> {
    // TODO: Implementar con WatermelonDB
    return true;
  },

  async getAll(): Promise<Note[]> {
    // TODO: Implementar con WatermelonDB + lazy loading
    return [];
  },

  async getById(id: string): Promise<Note | null> {
    // TODO: Implementar con WatermelonDB
    return null;
  },
};