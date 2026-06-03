# Secure Notes Specification

## Purpose
Esta especificación define el ciclo de vida y los requerimientos de seguridad para el acceso, apertura y eliminación de notas marcadas como seguras (`isSecure: true`) mediante PIN y biometría en el dispositivo local, previniendo race conditions en las acciones de autenticación.

## Requirements

### Requirement: Biometric Note Open
El sistema MUST requerir autenticación biométrica o PIN para abrir y visualizar el contenido de una nota segura. Al autorizar, la acción ejecutada debe ser estrictamente `'open'`. El sistema SHALL NOT procesar ninguna acción de eliminación diferida o residual.

#### Scenario: Successful Biometric Unlock
- GIVEN una nota segura guardada en la base de datos
- WHEN el usuario presiona la nota para abrirla
- AND la autenticación biométrica resulta exitosa
- THEN el visor de la nota MUST abrirse mostrando el contenido desencriptado

#### Scenario: Protection Against Obsolete Delete Action (Race Condition)
- GIVEN una nota segura guardada en la base de datos
- AND el usuario previamente canceló un intento de eliminación de una nota segura
- WHEN el usuario presiona la nota para abrirla
- AND la autenticación biométrica resulta exitosa
- THEN el visor de la nota MUST abrirse mostrando el contenido desencriptado
- AND la nota SHALL NOT ser eliminada de la base de datos

---

### Requirement: Biometric Note Delete
El sistema MUST requerir autenticación biométrica o PIN antes de eliminar permanentemente una nota segura. Al autorizar con éxito con la acción `'delete'`, la nota debe destruirse.

#### Scenario: Successful Biometric Delete
- GIVEN una nota segura guardada en la base de datos
- WHEN el usuario mantiene presionada la nota y selecciona "Eliminar"
- AND la autenticación biométrica resulta exitosa
- THEN la nota MUST ser eliminada permanentemente de la base de datos
- AND el visor de la nota SHALL NOT ser mostrado
