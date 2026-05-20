import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string', isOptional: true },
        { name: 'is_secure', type: 'boolean' },
        { name: 'is_marked', type: 'boolean' },
        { name: 'audio_uri', type: 'string', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'illustration', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
