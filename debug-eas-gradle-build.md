# Debug Session: eas-gradle-build [OPEN]

## Context
- Symptom: `EAS Build` falla en Android con `Gradle build failed with unknown error`.
- Goal: replicar exactamente el fix documentado en `implementation_plan.md` y verificar qué falta en esta máquina.
- Constraint: durante la fase inicial no se modifica lógica de negocio; solo se recopila evidencia y se alinea configuración/build.

## Hypotheses
1. Falta una dependencia nativa requerida por el fix previo y por eso `expo doctor`/Gradle divergen entre máquinas.
2. La configuración actual del proyecto no coincide exactamente con la solución registrada en `implementation_plan.md`.
3. El caché de EAS o el estado del lockfile está dejando una resolución distinta de dependencias en cada PC.
4. La fase `Run gradlew` está fallando por una incompatibilidad de arquitectura nativa o plugin de Babel/Reanimated.
5. El proyecto pasa chequeos superficiales, pero falla en prebuild/gradlew por configuración Android incompleta.

## Evidence Log
- `implementation_plan.md` confirma el fix previo: `newArchEnabled: true`, `react-native-reanimated ~4.1.1`, `expo-share-intent ^5.1.1`, plugin de `expo-local-authentication`.
- `package.json` estaba alineado con Reanimated 4 y `react-native-worklets`, pero faltaba `expo-system-ui`.
- `app.json` no declaraba configuración de `expo-build-properties`; por lo tanto, un build remoto de EAS no tenía garantizado el `kotlinVersion` observado localmente en `android/gradle.properties`.
- `frontend/.gitignore` excluye `/android`, por lo que el estado nativo generado localmente no se replica en EAS.
- `npx expo-doctor` pasa `18/18` luego de instalar dependencias faltantes y alinear config.
- `npx expo prebuild --platform android --no-install` termina correctamente tras declarar los plugins necesarios.
- `./gradlew assembleRelease --stacktrace` falla localmente en Windows durante `settings.gradle` con un proceso `node` que sale con código no cero; esto apunta a una divergencia de entorno local adicional y no invalida el fix declarativo requerido para EAS.

## Actions
- Leer `implementation_plan.md` y extraer el fix exacto.
- Comparar contra `package.json`, `app.json`, `babel.config.js`, `eas.json`.
- Validar dependencias y prebuild local sin tocar lógica de negocio.
- Instalar `react-native-worklets`, `expo-system-ui` y `expo-build-properties`.
- Declarar `expo-build-properties` con `android.kotlinVersion = 1.9.24` en `app.json`.
- Alinear `babel.config.js` con `react-native-worklets/plugin` y `react-native-reanimated/plugin`.

## Status
- Fix declarativo aplicado. Pendiente verificación en EAS con `--clear-cache`.
