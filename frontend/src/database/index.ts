import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import Note from './Note';

import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

const adapter = (Platform.OS === 'web' || process.env.NODE_ENV === 'test' || isExpoGo)
  ? new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
    })
  : new SQLiteAdapter({
      schema,
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
