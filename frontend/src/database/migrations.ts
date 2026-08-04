import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'notes',
          columns: [
            { name: 'reminder_at', type: 'number', isOptional: true },
            { name: 'calendar_event_id', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
