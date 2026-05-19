const fs = require('fs');
const path = require('path');

console.log('--- Bunker Notas: Evaluando Manifiesto Arquitectónico ---');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

let failures = 0;

function assertRule(name, condition, failureMessage) {
  if (condition) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name}`);
    console.log(`   └─ Detalle: ${failureMessage}`);
    failures++;
  }
}

// Regla 1: TDD First
const srcDir = path.join(rootDir, 'src');
const testsDir = path.join(rootDir, '__tests__');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      fileList = getFiles(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const srcFiles = getFiles(srcDir)
  .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
  .filter(f => !f.endsWith('index.ts') && !f.endsWith('types.ts') && !f.includes('types\\') && !f.includes('types/'));

const testFiles = getFiles(testsDir);
const missingTests = [];

srcFiles.forEach(srcFile => {
  const relativePath = path.relative(srcDir, srcFile);
  const expectedTestFile = relativePath.replace(/\.(tsx?)$/, '.test.$1');
  
  const hasTest = testFiles.some(f => {
    return f.endsWith(expectedTestFile.replace(/\\/g, '/')) || f.endsWith(expectedTestFile);
  });

  if (!hasTest) {
    missingTests.push(relativePath);
  }
});

assertRule(
  'Mandato 1: TDD First (Cobertura Estructural)',
  missingTests.length === 0,
  `Faltan archivos de test para:\n      - ${missingTests.join('\n      - ')}`
);

// Regla 2: Seguridad Local
assertRule(
  'Mandato 2: Local Security (expo-local-authentication)',
  deps['expo-local-authentication'],
  'No se encontró la librería en package.json'
);

assertRule(
  'Mandato 2: Local Security (react-native-keychain)',
  deps['react-native-keychain'],
  'No se encontró la librería en package.json'
);

// Regla 3: WatermelonDB
assertRule(
  'Mandato 3: Lazy Loading (WatermelonDB)',
  deps['@nozbe/watermelondb'],
  'No se encontró @nozbe/watermelondb en package.json. Se están usando repositorios custom en su lugar.'
);

// Regla 4: Symmetrical Design (Blur y Padlock en NoteCard)
const noteCardPath = path.join(rootDir, 'src', 'notes', 'NoteCard.tsx');
if (fs.existsSync(noteCardPath)) {
  const content = fs.readFileSync(noteCardPath, 'utf8');
  const hasPadlock = content.includes('🔒') || content.includes('padlock');
  const hasBlur = content.includes('blur') || content.includes('BlurView');
  
  assertRule(
    'Mandato 4: Visuals (Padlock en notas seguras)',
    hasPadlock,
    'El NoteCard no renderiza un candado para identificar visualmente las notas seguras.'
  );

  assertRule(
    'Mandato 4: Visuals (Blurred thumbnails)',
    hasBlur,
    'El NoteCard no utiliza BlurView ni utilidades de blur para ofuscar el contenido seguro.'
  );
} else {
  assertRule('Mandato 4: Visuals', false, 'No existe NoteCard.tsx');
}

console.log('\n=============================================');
if (failures === 0) {
  console.log('🎉 RESULTADO: El proyecto CUMPLE PERFECTAMENTE con el manifiesto.');
  process.exit(0);
} else {
  console.log(`⚠️ RESULTADO: El proyecto TIENE ${failures} VIOLACIONES ARQUITECTÓNICAS críticas.`);
  process.exit(1);
}
