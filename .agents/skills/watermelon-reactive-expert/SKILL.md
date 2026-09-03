---
name: watermelon-reactive-expert
description: >
  Experto en SQLite Reactivo, decoradores y WatermelonDB para React Native y Expo.
  Trigger: Archivos dentro de src/database/, src/models/, queries de WatermelonDB, decoradores (@reader, @writer) o componentes que observen colecciones.
license: MIT
metadata:
  author: bunker-notas
  version: "1.0"
---

# WatermelonDB Reactive Expert 🍉

Guía y auditor de arquitectura para el manejo de **WatermelonDB** y SQLite reactivo en React Native, evitando los errores clásicos de mutación, getters no enumerables y desfasajes de UI.

## Triggers de Activación
- Archivos en `frontend/src/database/` (schemas, migraciones, inicialización de DB).
- Modelos de datos en `frontend/src/models/` o `src/database/models/` (`NoteModel`, `CategoryModel`).
- Componentes o hooks que consuman colecciones (`database.get('notes')`), usen `observe()` o llamen a `withObservables`.

---

## Patrones Críticos y Prohibiciones

### 1. ❌ PROHIBIDO el Shallow Spread `{ ...note }` sobre Modelos
Las instancias de modelos de WatermelonDB encapsulan sus propiedades (`title`, `content`, `isSecure`, `pinned`, etc.) en **getters no enumerables** definidos en la clase.
- **Error mortal:** `{ ...note }` devuelve un objeto plano vacío o incompleto `{ id: "...", _raw: ... }` sin `title` ni `content`, causando pantallas en blanco o datos vacíos al renderizar.
- **Forma correcta:** Acceder explícitamente a las propiedades o mapear un DTO controlado:
  ```typescript
  // ❌ INCORRECTO - Destruye getters
  setSelectedNote({ ...note });

  // ✅ CORRECTO - Mapeo explícito
  setSelectedNote({
    id: note.id,
    title: note.title,
    content: note.content,
    isSecure: note.isSecure,
    pinned: note.pinned,
    audioUri: note.audioUri,
  });
  ```

### 2. ✅ Forzar Mutaciones en Bloques `database.write(...)`
Toda creación (`create`), actualización (`update`) o eliminación (`markAsDeleted` / `destroyPermanently`) DEBE estar envuelta en un bloque asíncrono `database.write`:
```typescript
await database.write(async () => {
  await note.update((record) => {
    record.title = newTitle;
    record.content = newContent;
  });
});
```

### 3. ✅ Casteo Booleano Explícito (`!!`) en JSX
Para prevenir el error clásico de React Native Web `Unexpected text node: .` cuando se usan short-circuits con strings o valores opcionales:
```tsx
// ❌ RIESGOSO: Si audioUri es string vacío o undefined puede generar nodos de texto inesperados
{note.audioUri && <AudioPlayer uri={note.audioUri} />}

// ✅ SEGURO:
{!!note.audioUri && <AudioPlayer uri={note.audioUri} />}
```

### 4. ✅ Consultas Reactivas y Observabilidad
- Al listar colecciones dinámicas (Feed de notas, filtrado por tags), usar `collection.query(...).observe()` para que WatermelonDB notifique reactivamente los cambios sin re-renders manuales ni polling.
