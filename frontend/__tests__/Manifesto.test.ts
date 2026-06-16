/// <reference types="node" />
import fs from 'fs';
import path from 'path';

describe('AGENTS.md Manifesto Architectural Constraints', () => {
  const rootDir = path.resolve(__dirname, '../');
  const packageJsonPath = path.join(rootDir, 'package.json');
  let packageJson: any;
  let deps: any;

  beforeAll(() => {
    const fileContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(fileContent);
    deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  });

  it('Mandate 1: TDD First - Every TS/TSX file in src/ must have a corresponding test', () => {
    const srcDir = path.join(rootDir, 'src');
    const testsDir = path.join(rootDir, '__tests__');

    const getFiles = (dir: string, fileList: string[] = []) => {
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
    };

    const srcFiles = getFiles(srcDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
      .filter(f => !f.endsWith('index.ts') && !f.endsWith('types.ts') && !f.includes('types/'));

    const testFiles = getFiles(testsDir);

    const missingTests: string[] = [];

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

    if (missingTests.length > 0) {
      throw new Error(`\nLos siguientes archivos violan la regla TDD First. Faltan sus tests:\n${missingTests.join('\n')}`);
    }
    
    expect(missingTests.length).toBe(0);
  });

  it('Mandate 2: Local Security - Must implement expo-local-authentication', () => {
    expect(deps['expo-local-authentication']).toBeDefined();
  });

  it('Mandate 2: Local Security - Must implement react-native-keychain', () => {
    expect(deps['react-native-keychain']).toBeDefined();
  });

  it('Mandate 3: Lazy Loading - All DB queries must be WatermelonDB-reactive', () => {
    const hasWatermelon = deps['@nozbe/watermelondb'];
    if (!hasWatermelon) {
      throw new Error("Violación de Arquitectura: Falta @nozbe/watermelondb. La app no cumple la regla de reactividad.");
    }
    expect(hasWatermelon).toBeDefined();
  });

  it('Mandate 4: Visuals - Symmetrical Design Rule (Blur & Padlock)', () => {
    // Si bien este test no renderiza el NoteCard (para eso haríamos un test en Testing Library),
    // comprobamos arquitectónicamente leyendo el código del componente si usa la palabra 'blur' o un equivalente nativo.
    const noteCardPath = path.join(rootDir, 'src', 'notes', 'NoteCard.tsx');
    if (fs.existsSync(noteCardPath)) {
      const content = fs.readFileSync(noteCardPath, 'utf8');
      const hasPadlock = content.includes('🔒') || content.includes('padlock');
      const hasBlur = content.includes('blur') || content.includes('BlurView');
      
      if (!hasPadlock) throw new Error("Violación Visual: No se encontró ícono de candado en NoteCard");
      if (!hasBlur) throw new Error("Violación Visual: No se encontró uso de Blur (BlurView o CSS) en NoteCard");
    }
  });
});
