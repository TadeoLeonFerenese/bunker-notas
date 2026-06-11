# Skill: Optimización y Reactividad con WatermelonDB

## Overview

Este skill define los estándares para interactuar con WatermelonDB de manera performante y reactiva en Bunker Notas. WatermelonDB está diseñado para manejar miles de notas de forma asíncrona usando SQLite en nativo, pero requiere seguir patrones rigurosos de reactividad para no saturar el renderizado de React Native.

## Principios de WatermelonDB en Bunker Notas

1. **Reactividad con Observables:** No extraigas datos de la DB al estado de React manualmente en componentes de lista. Usa `withObservables` para enlazar los modelos directamente a las vistas.
2. **Escrituras en Lote (Batching) y Transacciones:** Cualquier cambio (creación, edición, eliminación) debe ocurrir dentro de un bloque `database.write(...)` para garantizar consistencia y rapidez en SQLite.
3. **Lazy Loading:** Los datos pesados o relacionales (archivos adjuntos, audios) deben cargarse de forma diferida usando `@lazy` o relaciones reactivas.

## Patrones de Código

### 1. Conectar Componentes Reactivos (`withObservables`)
En lugar de disparar `useEffect` para leer notas de la base de datos, conecta el componente para que reaccione automáticamente a cambios, inserciones o eliminaciones.

```typescript
import { withObservables } from '@nozbe/watermelondb/react';
import { compose } from 'recompose'; // O composición manual
import NoteModel from '../database/Note';

// Componente Presentacional (Puro)
const NoteList = ({ notes }: { notes: NoteModel[] }) => (
  <FlatList
    data={notes}
    keyExtractor={item => item.id}
    renderItem={({ item }) => <NoteCard note={item} />}
  />
);

// Componente Contenedor Reactivo
const enhance = withObservables(['searchQuery'], ({ searchQuery, database }) => ({
  notes: database.collections
    .get<NoteModel>('notes')
    .query(
      // Si hay búsqueda, filtrar eficientemente por SQL
      searchQuery 
        ? Q.where('title', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`))
        : Q.where('is_archived', false)
    )
    .observe(), // .observe() devuelve un Observable que withObservables suscribe automáticamente
}));

export default enhance(NoteList);
```

### 2. Escrituras y Modificaciones Eficientes
Nunca ejecutes escrituras individuales seguidas dentro de bucles. Agrupa todo en una sola transacción asíncrona.

```typescript
import { database } from './database';
import NoteModel from './database/Note';

export const createNote = async (title: string, content: string, isSecure: boolean) => {
  await database.write(async () => {
    const notesCollection = database.collections.get<NoteModel>('notes');
    await notesCollection.create(note => {
      note.title = title;
      note.content = content;
      note.isSecure = isSecure;
      note.createdAt = new Date();
    });
  });
};
```

### 3. Manejo de Migraciones y Cambios de Esquema
Cada vez que agreguemos campos para nuevas features (como la ruta del archivo de imagen encriptada `image_path` o claves de cifrado individuales), debemos:
1. Modificar el archivo `src/database/schema.ts` incrementando la versión del esquema.
2. Añadir la migración correspondiente en `src/database/migrations.ts` para no borrar los datos existentes de los usuarios.

*   **Ejemplo de migración segura:**
```typescript
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'notes',
          columns: [
            { name: 'image_path', type: 'string', isOptional: true },
            { name: 'image_iv', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
```

## Errores Comunes a Evitar

*   **No sanitizar queries:** Usa siempre `Q.sanitizeLikeString()` en búsquedas textuales para prevenir inyecciones SQL en SQLite.
*   **Olvidar transacciones asíncronas:** Las operaciones fuera de `database.write` fallarán estrepitosamente en WatermelonDB.
*   **Hacer `.observe()` anidados innecesarios:** Si un componente hijo solo necesita renderizar el título estático de una nota, pásale el valor directamente en lugar de pasar el modelo entero y volver a observarlo.
