const fs = require('fs');

function updateApp() {
  let content = fs.readFileSync('App.tsx', 'utf8');

  // 1. Imports
  const imports = `import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';\n`;
  content = content.replace('import React', imports + 'import React');

  // 2. Theme array
  content = content.split("(['classic', 'emerald', 'cyberpunk', 'matrix'] as ThemeType[])")
                 .join("(['classic', 'emerald', 'cyberpunk', 'matrix', 'light', 'dark'] as ThemeType[])");

  // 3. App definition
  const appDef = `export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Roboto_400Regular,
    Roboto_700Bold,
    SpaceMono_400Regular,
  });

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (`;
  content = content.replace('export default function App() {\n  return (', appDef);

  // 4. Styles replacements
  content = content.split('style={[styles.headerTitle').join('style={[{fontFamily: COLORS.fontFamily}, styles.headerTitle');
  content = content.split('style={[styles.headerSubtitle').join('style={[{fontFamily: COLORS.fontFamily}, styles.headerSubtitle');
  content = content.split('style={[styles.filterText').join('style={[{fontFamily: COLORS.fontFamily}, styles.filterText');
  content = content.split('style={[styles.modalTitle').join('style={[{fontFamily: COLORS.fontFamily}, styles.modalTitle');
  content = content.split('style={[styles.modalInput').join('style={[{fontFamily: COLORS.fontFamily}, styles.modalInput');
  content = content.split('style={[styles.viewerTitle').join('style={[{fontFamily: COLORS.fontFamily}, styles.viewerTitle');
  content = content.split('style={[styles.viewerText').join('style={[{fontFamily: COLORS.fontFamily}, styles.viewerText');
  
  // Theme text in dropdown
  content = content.split("fontWeight: theme === t ? '600' : '400',").join("fontWeight: theme === t ? '600' : '400',\n                          fontFamily: COLORS.fontFamily,");

  fs.writeFileSync('App.tsx', content);
  console.log('App.tsx updated');
}

function updateNoteCard() {
  let content = fs.readFileSync('src/notes/NoteCard.tsx', 'utf8');

  content = content.split('style={[stylesGrid.title').join('style={[{fontFamily: COLORS.fontFamily}, stylesGrid.title');
  content = content.split('style={[stylesGrid.content').join('style={[{fontFamily: COLORS.fontFamily}, stylesGrid.content');
  content = content.split('style={[stylesList.title').join('style={[{fontFamily: COLORS.fontFamily}, stylesList.title');
  content = content.split('style={[stylesList.content').join('style={[{fontFamily: COLORS.fontFamily}, stylesList.content');

  fs.writeFileSync('src/notes/NoteCard.tsx', content);
  console.log('NoteCard.tsx updated');
}

updateApp();
updateNoteCard();
