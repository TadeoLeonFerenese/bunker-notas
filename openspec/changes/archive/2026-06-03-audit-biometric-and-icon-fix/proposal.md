# Proposal: Auditoría de Biometría y Corrección de Ícono

## Intent
Corregir el bug crítico en el que las notas seguras se eliminan al abrirse con biometría debido a race conditions en closures asíncronos de React. Adicionalmente, establecer auditorías automatizadas para verificar el ciclo de autenticación local y aplicar el ícono oficial `BunkerNotas.png`.

## Scope

### In Scope
- Refactorizar el flujo de autenticación de notas seguras pasando el parámetro `action` de forma explícita en las firmas de funciones.
- Agregar dependencias necesarias de desarrollo (`jimp`) y ejecutar el script `process-icon.js` para generar los iconos en assets.
- Desarrollar suite de tests de integración para el ciclo de apertura y borrado de notas seguras.

### Out of Scope
- Sincronización en la nube o bases de datos externas (el proyecto se mantiene offline-first).
- Rediseño estético del login (solo corrección lógica).

## Capabilities

### New Capabilities
- `secure-notes`: Especificar el ciclo de vida, apertura y borrado de notas protegidas por PIN y biometría.

### Modified Capabilities
None

## Approach
1. **Refactor de Firmas**: Modificar `showPinInput`, `tryBiometricAuth` y `executeAuthAction` en `App.tsx` para aceptar `action: 'open' | 'delete'`. Eliminar el uso de la variable de estado `authAction` en estas llamadas para prevenir closures desactualizados en el `setTimeout`.
2. **Auditoría (Tests)**: Escribir pruebas en `App.test.tsx` (o un archivo específico) para validar el comportamiento seguro:
   - Dado una nota segura, al autenticarse con éxito con acción 'open', debe abrir el visor.
   - Dado una nota segura, al autenticarse con acción 'delete', debe destruirla.
   - Simular interacciones rápidas (race condition) para asegurar estabilidad.
3. **Ícono**: Instalar `jimp` en devDependencies, correr `node process-icon.js` para recrear `assets/icon.png` y `assets/adaptive-icon.png`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/App.tsx` | Modified | Refactor de autenticación biométrica. |
| `frontend/package.json` | Modified | Adición de `jimp` en devDependencies. |
| `frontend/assets/` | Modified | Nuevos archivos de iconos generados. |
| `frontend/__tests__/` | New | Suite de pruebas de integración para la auditoría de biometría. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Falla en la carga nativa de biometría en tests | Medium | Mockear exhaustivamente `expo-local-authentication` en `jest.setup.js`. |
| Jimp no puede procesar el PNG desde el Desktop | Low | Validar ruta exacta de `BunkerNotas.png` antes de correr el script. |

## Rollback Plan
- Revertir cambios en `App.tsx` y `package.json` mediante `git checkout`. Los assets de iconos se pueden regenerar a su estado previo con git.

## Dependencies
- Archivo `C:\Users\Tadeo Leon Ferense\Desktop\BunkerNotas.png` en el Escritorio.

## Success Criteria
- [ ] Los tests de apertura y borrado de notas seguras pasan de forma consistente.
- [ ] Las notas seguras no se borran al abrirse con biometría.
- [ ] Los iconos oficiales se encuentran correctamente posicionados en la carpeta `assets/` y se renderizan sin error en la compilación.
