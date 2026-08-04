import schema from '../../src/database/schema';

describe('Database Schema', () => {
  it('Should define the notes table with correct columns', () => {
    expect(schema.version).toBe(3);
    expect(schema.tables.notes).toBeDefined();
    
    expect(schema.tables.notes.columns.reminder_at).toEqual({ name: 'reminder_at', type: 'number', isOptional: true });
    expect(schema.tables.notes.columns.calendar_event_id).toEqual({ name: 'calendar_event_id', type: 'string', isOptional: true });
  });
});
