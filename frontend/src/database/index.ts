import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';
import Note from './Note';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false,
  onSetUpError: error => {
    console.error("WatermelonDB Error", error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    Note,
  ],
});
