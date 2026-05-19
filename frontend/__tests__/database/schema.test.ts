import schema from '../../src/database/schema';

describe('Database Schema', () => {
  it('Should define the notes table with correct columns', () => {
    expect(schema.version).toBe(1);
    expect(schema.tables.notes).toBeDefined();
  });
});
