## Exploration: Auditoría de Biometría y Corrección de Ícono

### Current State
El sistema presenta un bug crítico de pérdida de datos al abrir notas seguras con biometría. Cuando el usuario interactúa para abrir la nota, el flujo de autenticación en `App.tsx` agenda asíncronamente `setAuthAction('open')`. Sin embargo, `showPinInput` programa un `setTimeout` de 300ms para disparar el prompt biométrico nativo nativo (`tryBiometricAuth`). Este timeout captura el closure del render anterior de React, donde `authAction` aún conserva su valor anterior (que es `'delete'` si la última acción de autenticación fue eliminar una nota segura). Al pasar la biometría con éxito, se ejecuta `executeAuthAction` con el valor obsoleto `'delete'` y la nota se elimina de WatermelonDB en lugar de abrirse.

Con respecto al ícono, el archivo `C:\Users\Tadeo Leon Ferense\Desktop\BunkerNotas.png` no está procesado en los assets de Expo. Aunque existe un script local `process-icon.js` para esto, requiere instalar la dependencia `jimp` si no está presente y ejecutarlo para regenerar los assets `icon.png` y `adaptive-icon.png`.

### Affected Areas
- `frontend/src/screens/LoginScreen.tsx` — Flujo de autenticación general.
- `frontend/App.tsx` — Lógica principal de apertura, eliminación y autenticación de notas en `tryBiometricAuth` y `executeAuthAction`.
- `frontend/package.json` — Adición de `jimp` como dependencia de desarrollo si es necesario para correr el script.
- `frontend/assets/` — Carpeta de assets de iconos.

### Approaches

1. **Pasar `action` como parámetro explícito en el flujo de funciones (Recomendado)**
   - Evita el uso de variables de estado efímeras que dependen de race conditions del ciclo de renderizado de React en closures programadas por `setTimeout`.
   - **Pros**: Solución 100% limpia y idiomática en React. Elimina por completo las colisiones de estado en closures.
   - **Cons**: Requiere cambiar las firmas de `showPinInput`, `tryBiometricAuth` y `executeAuthAction`.
   - **Effort**: Low

2. **Usar una Referencia de React (`useRef`) para `authAction`**
   - Usar `authActionRef.current` para leer siempre el valor más actual de la acción de autenticación.
   - **Pros**: Requiere menos cambios en las firmas de funciones.
   - **Cons**: Introduce mutación de referencias en React, lo que puede ser más difícil de rastrear si no se limpia correctamente.
   - **Effort**: Low

### Recommendation
Se recomienda el **Enfoque 1 (Parámetro Explícito)**. En lugar de depender de una variable de estado que se actualiza de manera asíncrona, pasar `action` ('open' | 'delete') como parámetro asegura que el prompt biométrico ejecute exactamente la acción programada al momento de iniciar la solicitud, sin importar cuándo ocurra la actualización del estado o los re-renders.

Para las auditorías, crearemos tests unitarios y de integración con Jest que simulen este flujo asíncrono y verifiquen que un cambio de acción posterior a un intento no afecte la acción en curso.

Para el ícono, instalaremos `jimp` y correremos el script `process-icon.js`.

### Risks
- **Riesgo:** Incompatibilidad de `jimp` con versiones recientes de Node.
  - *Mitigación:* Usar la versión estable recomendada o copiar/procesar el ícono manualmente si falla el script automatizado.
- **Riesgo:** Falso positivo en tests por falta de mocks correctos del módulo nativo `expo-local-authentication`.
  - *Mitigación:* Reforzar los mocks en `jest.setup.js` para controlar el resultado de `authenticateAsync`.

### Ready for Proposal
Yes. Se puede proceder con la creación de la propuesta para este cambio.
