// Note: NotesRepository is legacy, to be replaced by WatermelonDB.
describe('NotesRepository (Legacy)', () => {
  it('Should be defined', () => {
    const NotesRepository = require('../../src/notes/NotesRepository');
    expect(NotesRepository).toBeDefined();
  });
});
