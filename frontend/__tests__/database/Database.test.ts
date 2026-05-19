import { database } from '../../src/database';
import NoteModel from '../../src/database/Note';

describe('WatermelonDB Data Layer', () => {
  it('Should configure the database with Note model', () => {
    // Verificar que la base de datos se inicializa con las colecciones correctas
    expect(database.collections.get<NoteModel>('notes')).toBeDefined();
  });
});
