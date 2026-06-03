import Note from '../../src/database/Note';

describe('Note Model', () => {
  it('Should have the correct table name', () => {
    expect(Note.table).toBe('notes');
  });
});
