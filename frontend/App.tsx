import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Alert,
  useWindowDimensions,
  useColorScheme,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import LoginScreen from './src/screens/LoginScreen';
import { NoteCard, NOTE_COLORS, NOTE_ILLUSTRATIONS } from './src/notes/NoteCard';
import { withObservables } from '@nozbe/watermelondb/react';
import { database } from './src/database';
import NoteModel from './src/database/Note';
import RenderHtml from 'react-native-render-html';
import { ThemeProvider, useTheme, ThemeType } from './src/theme/ThemeContext';
import { encryption, encryptFile, decryptFile } from './src/notes/encryption';
import { backupService } from './src/backup/BackupService';
import { AIService, AIProvider } from './src/ai/AIService';
import * as Linking from 'expo-linking';
import { useShareIntent, ShareIntentProvider } from 'expo-share-intent';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FilterType = 'all' | 'marked' | 'secure';
type ViewMode = 'list' | 'grid';

export const AppContent = ({ notes }: { notes: NoteModel[] }) => {
  const { width } = useWindowDimensions();
  const { COLORS, isDark, theme, setTheme, customBackground, setCustomBackground } = useTheme();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    AsyncStorage.getItem('@bunker_view_mode').then(mode => {
      if (mode === 'grid' || mode === 'list') {
        setViewMode(mode);
      }
    }).catch(e => console.log('Error loading view mode', e));
  }, []);

  useEffect(() => {
    const loadAiConfig = async () => {
      try {
        const { getSecureCredential } = require('./src/notes/encryption');
        const storedProvider = await getSecureCredential('app_ai_provider') as AIProvider;
        const storedKey = await getSecureCredential('app_ai_key');
        if (storedProvider) setAiProvider(storedProvider);
        if (storedKey) setAiKey(storedKey);
      } catch (e) {
        console.log('Error loading AI config', e);
      }
    };
    loadAiConfig();
  }, []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteModel | null>(null);
  const [decryptedAudioUri, setDecryptedAudioUri] = useState<string | null>(null);
  const [decryptedImages, setDecryptedImages] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [showBurgerMenu, setShowBurgerMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiConfigModal, setAiConfigModal] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [aiKey, setAiKey] = useState('');
  const [isAiRecording, setIsAiRecording] = useState(false);
  const [aiRecording, setAiRecording] = useState<Audio.Recording | null>(null);
  const authActionRef = useRef<'open' | 'delete'>('open');
  const contentInputRef = useRef<any>(null);
  const [textSelection, setTextSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const currentSelectionRef = useRef({ start: 0, end: 0 });
  
  const [pendingExternalNote, setPendingExternalNote] = useState<{
    title: string;
    content: string;
    audioUri?: string | null;
    imageUri?: string | null;
  } | null>(null);
  const initialUrl = Linking.useURL();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (customBackground) {
      const checkFile = async () => {
        try {
          const info = await FileSystem.getInfoAsync(customBackground);
          console.log(`[Background Debug] File: ${customBackground}. Exists: ${info.exists}. Size: ${info.exists ? info.size : 'N/A'}`);
        } catch (err) {
          console.error('[Background Debug] Error checking file:', err);
        }
      };
      checkFile();
    } else {
      console.log('[Background Debug] customBackground is null');
    }
  }, [customBackground]);

  // Manejo de Deep Linking
  useEffect(() => {
    if (initialUrl) {
      const { hostname, path, queryParams } = Linking.parse(initialUrl);
      if (path === 'create' || hostname === 'create') {
        const title = queryParams?.title as string || '';
        const content = queryParams?.content as string || '';
        if (title || content) {
          setPendingExternalNote({ title, content });
        }
      }
    }
  }, [initialUrl]);

  // Manejo de Share Intent
  useEffect(() => {
    const handleShare = async () => {
      if (!hasShareIntent) return;

      const sharedText = shareIntent?.text || shareIntent?.webUrl;
      const sharedFiles = shareIntent?.files;

      if (sharedFiles && sharedFiles.length > 0) {
        const file = sharedFiles[0];
        const mime = file.mimeType || '';
        const isAudio = mime.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(file.path || '');
        const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(file.path || '');

        try {
          const extension = file.fileName?.split('.').pop() || (isAudio ? 'm4a' : 'jpg');
          const localFileName = `shared_${Date.now()}.${extension}`;
          const localUri = FileSystem.documentDirectory + localFileName;

          await FileSystem.copyAsync({
            from: file.path,
            to: localUri,
          });

          if (isAudio) {
            setPendingExternalNote({
              title: 'Audio Compartido',
              content: sharedText || '',
              audioUri: localUri,
            });
          } else if (isImage) {
            setPendingExternalNote({
              title: 'Imagen Compartida',
              content: (sharedText ? sharedText + '\n\n' : '') + `![Imagen Compartida](${localUri})`,
              imageUri: localUri,
            });
          } else {
            setPendingExternalNote({
              title: 'Nota Compartida',
              content: sharedText || `Archivo compartido: ${file.fileName}`,
            });
          }
        } catch (err) {
          console.error('[ShareIntent] Error procesando archivo compartido:', err);
          Alert.alert('Error', 'No se pudo procesar el archivo compartido.');
        }
      } else if (sharedText) {
        setPendingExternalNote({ title: 'Nota Compartida', content: sharedText });
      }

      resetShareIntent();
    };

    handleShare();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  // Compuerta de seguridad: Mostrar modal solo si está autenticado
  useEffect(() => {
    if (isAuthenticated && pendingExternalNote) {
      setNewNoteTitle(pendingExternalNote.title);
      setNewNoteContent(pendingExternalNote.content);
      setRecordedAudioUri(pendingExternalNote.audioUri || null);
      setNewNoteSecure(false); // Por defecto no encriptada para que el usuario elija
      setShowCreateModal(true);
      setPendingExternalNote(null);
    }
  }, [isAuthenticated, pendingExternalNote]);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const LocalAuthentication = require('expo-local-authentication');
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricAvailable(hasHardware && isEnrolled);
      } catch (e) {
        console.log(e);
      }
    };
    checkBiometrics();
  }, []);

  // Decrypt media when opening a secure note, and clean up when closing
  useEffect(() => {
    if (!selectedNote) {
      const cleanup = async () => {
        if (decryptedAudioUri) {
          try { await FileSystem.deleteAsync(decryptedAudioUri, { idempotent: true }); } catch (e) {}
          setDecryptedAudioUri(null);
        }
        for (const uri of Object.values(decryptedImages)) {
          try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch (e) {}
        }
        setDecryptedImages({});
      };
      cleanup();
      return;
    }

    const decryptMedia = async () => {
      // 1. Audio
      if (selectedNote.isSecure && selectedNote.audioUri && selectedNote.audioUri.endsWith('.enc')) {
        try {
          const tempPath = await decryptFile(selectedNote.audioUri);
          setDecryptedAudioUri(tempPath);
        } catch (e) {
          console.error("Failed to decrypt audio", e);
        }
      } else {
        setDecryptedAudioUri(selectedNote.audioUri || null);
      }

      // 2. Images in content
      if (selectedNote.isSecure && selectedNote.content) {
        const matches = selectedNote.content.match(/!\[.*?\]\((file:\/\/.*?\.enc)\)/g);
        if (matches) {
          const newDecryptedMap: Record<string, string> = {};
          for (const match of matches) {
            const urlMatch = match.match(/\((file:\/\/.*?\.enc)\)/);
            if (urlMatch && urlMatch[1]) {
              const encUri = urlMatch[1];
              try {
                const tempPath = await decryptFile(encUri);
                newDecryptedMap[encUri] = tempPath;
              } catch (e) {
                console.error("Failed to decrypt image", encUri, e);
              }
            }
          }
          setDecryptedImages(newDecryptedMap);
        }
      }
    };
    decryptMedia();
  }, [selectedNote]);

  // Create Note State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteSecure, setNewNoteSecure] = useState(false);
  const [newNoteColor, setNewNoteColor] = useState('default');
  const [newNoteIllustration, setNewNoteIllustration] = useState('none');
  const [activeToolbar, setActiveToolbar] = useState<'format' | 'color' | 'doodle' | 'ai' | null>(null);
  // Audio State & Refs
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const recordingIntervalRef = useRef<any>(null);

  // Autosave System
  const saveTimeoutRef = useRef<any>(null);
  const noteStateRef = useRef({
    title: newNoteTitle,
    content: newNoteContent,
    isSecure: newNoteSecure,
    color: newNoteColor,
    illustration: newNoteIllustration,
    audioUri: recordedAudioUri,
    editingNoteId: editingNoteId,
    showCreateModal: showCreateModal,
  });

  useEffect(() => {
    noteStateRef.current = {
      title: newNoteTitle,
      content: newNoteContent,
      isSecure: newNoteSecure,
      color: newNoteColor,
      illustration: newNoteIllustration,
      audioUri: recordedAudioUri,
      editingNoteId: editingNoteId,
      showCreateModal: showCreateModal,
    };
  }, [newNoteTitle, newNoteContent, newNoteSecure, newNoteColor, newNoteIllustration, recordedAudioUri, editingNoteId, showCreateModal]);

  const performAutosave = async () => {
    try {
      const { title, content, isSecure, color, illustration, audioUri, editingNoteId: currentEditingId, showCreateModal: isModalVisible } = noteStateRef.current;

      // Si el modal ya no está visible, no autoguardamos
      if (!isModalVisible) return;

      // Si el título, contenido y audio están completamente vacíos y no hay un ID de edición aún, no guardamos para evitar crear notas vacías
      if (!title.trim() && !content.trim() && !audioUri && !currentEditingId) {
        return;
      }

      let finalAudioUri = audioUri;
      let finalContent = content.trim();

      if (isSecure) {
        // Validar clave de encriptación activa
        if (!encryption.hasSessionKey()) {
          throw new Error('No encryption key in session. Please unlock the app first.');
        }

        // 1. Encriptar audio si no está encriptado
        if (audioUri && !audioUri.endsWith('.enc')) {
          try {
            const encPath = await encryptFile(audioUri);
            finalAudioUri = encPath;
            setRecordedAudioUri(encPath);
          } catch (e) {
            console.error('[Autosave] Error encriptando audio:', e);
          }
        }

        // 2. Encriptar imágenes en markdown content si no están encriptadas
        const matches = finalContent.match(/!\[.*?\]\((file:\/\/.*?)\)/g);
        if (matches) {
          for (const match of matches) {
            const urlMatch = match.match(/\((file:\/\/.*?)\)/);
            if (urlMatch && urlMatch[1] && !urlMatch[1].endsWith('.enc')) {
              const plainUri = urlMatch[1];
              try {
                const encPath = await encryptFile(plainUri);
                finalContent = finalContent.replace(plainUri, encPath);
              } catch (e) {
                console.error('[Autosave] Error encriptando imagen:', plainUri, e);
              }
            }
          }
          if (finalContent !== content.trim()) {
            setNewNoteContent(finalContent);
          }
        }
      } else {
        // 1. Desencriptar audio si el usuario quita el candado
        if (audioUri && audioUri.endsWith('.enc')) {
          try {
            const decPath = await decryptFile(audioUri);
            const extension = audioUri.match(/\.([a-zA-Z0-9]+)\.enc$/)?.[1] || 'm4a';
            const permanentPath = FileSystem.documentDirectory + `audio_${Date.now()}.${extension}`;
            await FileSystem.moveAsync({ from: decPath, to: permanentPath });
            finalAudioUri = permanentPath;
            setRecordedAudioUri(permanentPath);
            await FileSystem.deleteAsync(audioUri, { idempotent: true });
          } catch (e) {
            console.error('[Autosave] Error desencriptando audio al quitar seguridad:', e);
          }
        }

        // 2. Desencriptar imágenes en markdown content si el usuario quita el candado
        const matches = finalContent.match(/!\[.*?\]\((file:\/\/.*?\.enc)\)/g);
        if (matches) {
          for (const match of matches) {
            const urlMatch = match.match(/\((file:\/\/.*?\.enc)\)/);
            if (urlMatch && urlMatch[1]) {
              const encUri = urlMatch[1];
              try {
                const decPath = await decryptFile(encUri);
                const extension = encUri.match(/\.([a-zA-Z0-9]+)\.enc$/)?.[1] || 'jpg';
                const permanentPath = FileSystem.documentDirectory + `image_${Date.now()}.${extension}`;
                await FileSystem.moveAsync({ from: decPath, to: permanentPath });
                finalContent = finalContent.replace(encUri, permanentPath);
                await FileSystem.deleteAsync(encUri, { idempotent: true });
              } catch (e) {
                console.error('[Autosave] Error desencriptando imagen al quitar seguridad:', encUri, e);
              }
            }
          }
          if (finalContent !== content.trim()) {
            setNewNoteContent(finalContent);
          }
        }
      }

      const titleToStore = title.trim() || 'Sin título';
      const contentToStore = isSecure ? encryption.encrypt(finalContent) : finalContent;

      await database.write(async () => {
        if (currentEditingId) {
          const note = await database.get<NoteModel>('notes').find(currentEditingId);
          await note.update((n: any) => {
            n.title = titleToStore;
            n.content = contentToStore;
            n.isSecure = isSecure;
            n.audioUri = finalAudioUri || '';
            n.color = color;
            n.illustration = illustration;
          });
          console.log('[Autosave] Nota actualizada en DB:', currentEditingId);
        } else {
          const newNote = await database.get<NoteModel>('notes').create((note: any) => {
            note.title = titleToStore;
            note.content = contentToStore;
            note.isSecure = isSecure;
            note.isMarked = false;
            note.audioUri = finalAudioUri || '';
            note.color = color;
            note.illustration = illustration;
          });
          setEditingNoteId(newNote.id);
          console.log('[Autosave] Nueva nota creada con ID:', newNote.id);
        }
      });
    } catch (err) {
      console.error('[Autosave] Error al guardar en DB:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (!showCreateModal) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performAutosave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [newNoteTitle, newNoteContent, newNoteSecure, newNoteColor, newNoteIllustration, recordedAudioUri, showCreateModal]);

  const insertMarkdown = (marker: string) => {
    const { start, end } = currentSelectionRef.current;
    const text = newNoteContent;
    
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    let inserted = '';
    let newStart = start;
    let newEnd = end;

    const defaultText = "Texto";
    const content = selected || defaultText;

    if (marker === 'bold') {
      inserted = `**${content}**`;
      newStart += 2;
      newEnd = newStart + content.length;
    } else if (marker === 'italic') {
      inserted = `*${content}*`;
      newStart += 1;
      newEnd = newStart + content.length;
    } else if (marker === 'underline') {
      inserted = `__${content}__`;
      newStart += 2;
      newEnd = newStart + content.length;
    } else if (marker === 'list') {
      inserted = `\n- ${content}`;
      newStart += 3;
      newEnd = newStart + content.length;
    }

    const newContent = before + inserted + after;
    setNewNoteContent(newContent);
    setTextSelection({ start: newStart, end: newEnd });
  };

  const markdownToHtml = (md: string = ''): string => {
    // Si ya contiene etiquetas HTML, asumimos que es una nota antigua en formato HTML y la retornamos tal cual
    if (/<[a-z/][\s\S]*>/i.test(md)) {
      return md;
    }

    let html = md;
    
    // Sanitizar HTML básico
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Reemplazar saltos de línea por <br/>
    html = html.replace(/\n/g, '<br/>');
    
    // Reemplazar imágenes ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, url) => {
      const resolvedUrl = decryptedImages[url] || url;
      return `<img src="${resolvedUrl}" alt="${alt}" style="max-width: 100%; border-radius: 8px; margin-top: 8px; margin-bottom: 8px;" />`;
    });
    
    // Reemplazar **negrita**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Reemplazar *cursiva*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Reemplazar __subrayado__
    html = html.replace(/__(.*?)__/g, '<u>$1</u>');
    
    // Reemplazar listas "- elemento"
    html = html.replace(/(?:^|<br\/>)-\s+(.*?)(?=<br\/>|$)/g, '<li>$1</li>');
    
    // Envolver bloques de <li> en <ul>
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    return html;
  };

  // Keyboard Visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const handleInputFocus = () => {
    setIsKeyboardVisible(prev => {
      if (!prev) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      return true;
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardDidShowListener = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(prev => {
        if (!prev) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        return true;
      });
    });
    const keyboardDidHideListener = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(prev => {
        if (prev) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        return false;
      });
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Audio Lifecycle cleanup
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = async () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {}
      setRecording(null);
    }
    if (playbackSound) {
      try {
        await playbackSound.unloadAsync();
      } catch (e) {}
      setPlaybackSound(null);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordedAudioUri(null);
    setIsPlaybackPlaying(false);
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso al micrófono para grabar audios.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 127, // MAX
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'No se pudo iniciar la grabación de audio.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedAudioUri(uri);
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handlePlayAudio = async (uri: string) => {
    try {
      if (playbackSound && isPlaybackPlaying) {
        await playbackSound.pauseAsync();
        setIsPlaybackPlaying(false);
      } else if (playbackSound) {
        await playbackSound.playAsync();
        setIsPlaybackPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true }
        );
        setPlaybackSound(newSound);
        setIsPlaybackPlaying(true);
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis || 0);
            setPlaybackDuration(status.durationMillis || 0);
            if (status.didJustFinish) {
              setIsPlaybackPlaying(false);
              setPlaybackPosition(0);
            }
          }
        });
      }
    } catch (err) {
      console.error('Error playing sound', err);
      Alert.alert('Error', 'No se pudo reproducir el audio.');
    }
  };

  const stopAudio = async () => {
    if (playbackSound) {
      try {
        await playbackSound.stopAsync();
      } catch (e) {}
      setIsPlaybackPlaying(false);
      setPlaybackPosition(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMs = (ms: number) => {
    return formatTime(Math.floor(ms / 1000));
  };

  const handleCloseViewer = async () => {
    await stopAudio();
    if (playbackSound) {
      try {
        await playbackSound.unloadAsync();
      } catch (e) {}
      setPlaybackSound(null);
    }
    setSelectedNote(null);
  };

  const toggleSecureNote = () => {
    if (!newNoteSecure) {
      if (!encryption.hasSessionKey()) {
        Alert.alert(
          'Acceso no configurado',
          'Para encriptar esta nota, primero debes desbloquear la sesión de seguridad o configurar un PIN.'
        );
        return;
      }
      setNewNoteSecure(true);
    } else {
      setNewNoteSecure(false);
    }
  };

  const handleCloseCreateModal = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    try {
      // Guardamos sincrónicamente/inmediatamente antes de resetear estados
      await performAutosave();
    } catch (err) {
      console.error('[CloseModal] Error guardando la nota al cerrar:', err);
      Alert.alert(
        'Error al Guardar',
        'Hubo un problema al guardar la nota de forma segura. ¿Deseas salir de todas formas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir sin Guardar', style: 'destructive', onPress: async () => {
              await cleanupAudio();
              closeCreateModal();
            }
          }
        ]
      );
      return;
    }

    // Si la nota guardada quedó totalmente vacía (sin título ni contenido ni audio), y tiene id, la borramos para no dejar basura
    const { title, content, audioUri, editingNoteId: finalEditingId } = noteStateRef.current;
    if (!title.trim() && !content.trim() && !audioUri && finalEditingId) {
      try {
        await database.write(async () => {
          const note = await database.get<NoteModel>('notes').find(finalEditingId);
          await note.destroyPermanently();
        });
        console.log('[Autosave] Eliminada nota vacía de la base de datos al cerrar');
      } catch (err) {
        console.error('[Autosave] Error al limpiar nota vacía:', err);
      }
    }

    await cleanupAudio();
    closeCreateModal();
  };

  // Auth Handling
  const handleLoginSuccess = async (pin: string) => {
    try {
      const { getSecureCredential } = require('./src/notes/encryption');
      let salt = await getSecureCredential('app_encryption_salt');
      if (!salt) {
        salt = 'bunker-default-salt-value-for-device-migrations';
      }
      const CryptoJS = require('crypto-js');
      const derivedKey = CryptoJS.PBKDF2(pin, salt, { keySize: 256/32, iterations: 1000 }).toString();
      encryption.setSessionKey(derivedKey);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('[Auth] Error al derivar la clave de sesión:', e);
      setIsAuthenticated(true);
    }
  };

  const executeAuthAction = (note: NoteModel) => {
    setPinModalVisible(false);
    setPendingNote(null);

    if (authActionRef.current === 'delete') {
      deleteNote(note.id);
      return;
    }

    if (!note.isSecure) {
      setSelectedNote(note);
      return;
    }
    const raw = note as any;
    setSelectedNote({
      id: note.id,
      title: note.title,
      content: encryption.decrypt(note.content || ''),
      isSecure: true,
      isMarked: note.isMarked,
      audioUri: raw.audioUri,
      color: raw.color,
      illustration: raw.illustration,
      createdAt: raw.createdAt,
    } as any);
  };

  const handleNotePress = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    if (note.isSecure) {
      authActionRef.current = 'open';
      showPinInput(note);
    } else {
      setSelectedNote(note);
    }
  };

  const tryBiometricAuth = async (note: NoteModel) => {
    try {
      const LocalAuthentication = require('expo-local-authentication');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquea la nota encriptada',
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
      });
      
      if (result.success) {
        const { getSecureCredential } = require('./src/notes/encryption');
        const savedPin = await getSecureCredential('app_user_pin');
        let salt = await getSecureCredential('app_encryption_salt');
        if (savedPin) {
          if (!salt) salt = 'bunker-default-salt-value-for-device-migrations';
          const CryptoJS = require('crypto-js');
          const derivedKey = CryptoJS.PBKDF2(savedPin, salt, { keySize: 256/32, iterations: 1000 }).toString();
          encryption.setSessionKey(derivedKey);
        }
        executeAuthAction(note);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // PIN Handling
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pendingNote, setPendingNote] = useState<NoteModel | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [hasStoredPin, setHasStoredPin] = useState(false);

  const showPinInput = async (note: NoteModel) => {
    setPendingNote(note);
    setPinInput('');

    try {
      const { getSecureCredential } = require('./src/notes/encryption');
      const storedHash = await getSecureCredential('app_pin_hash');
      setHasStoredPin(!!storedHash);
    } catch (e) {
      setHasStoredPin(false);
    }

    setPinModalVisible(true);

    const { Platform } = require('react-native');
    if (Platform.OS !== 'web') {
      setTimeout(() => {
        tryBiometricAuth(note);
      }, 300);
    }
  };

  const validatePinAndOpen = async () => {
    if (pinInput.length < 4 || pinInput.length > 6) {
      Alert.alert('PIN inválido', 'El PIN debe tener entre 4 y 6 dígitos.');
      return;
    }

    try {
      const { getSecureCredential, verifyPin, storeSecureCredential, hashPin } = require('./src/notes/encryption');
      const storedHash = await getSecureCredential('app_pin_hash');

      if (!storedHash) {
        // Registro dinámico del primer PIN
        const hash = await hashPin(pinInput);
        const salt = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        await storeSecureCredential('app_encryption_salt', salt);
        await storeSecureCredential('app_user_pin', pinInput);
        await storeSecureCredential('app_pin_hash', hash);
        setHasStoredPin(true);
        Alert.alert('PIN Registrado', 'Has definido tu PIN de seguridad para las notas.');
        
        const CryptoJS = require('crypto-js');
        const derivedKey = CryptoJS.PBKDF2(pinInput, salt, { keySize: 256/32, iterations: 1000 }).toString();
        encryption.setSessionKey(derivedKey);

        if (pendingNote) {
          executeAuthAction(pendingNote);
        }
      } else {
        // Validar PIN real contra llavero seguro
        const isValid = await verifyPin(pinInput, storedHash);
        if (isValid) {
          let salt = await getSecureCredential('app_encryption_salt');
          if (!salt) {
            salt = 'bunker-default-salt-value-for-device-migrations';
          }
          const CryptoJS = require('crypto-js');
          const derivedKey = CryptoJS.PBKDF2(pinInput, salt, { keySize: 256/32, iterations: 1000 }).toString();
          encryption.setSessionKey(derivedKey);

          if (pendingNote) {
            executeAuthAction(pendingNote);
          }
        } else {
          Alert.alert('PIN Incorrecto', 'El PIN ingresado no coincide.');
          setPinInput('');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo validar el PIN de seguridad.');
    }
  };

  // Note Operations (WatermelonDB)
  const handleNoteLongPress = (noteId: string) => {
    Alert.alert('Opciones', '¿Qué quieres hacer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
          const note = notes.find(n => n.id === noteId);
          if (note?.isSecure) {
             authActionRef.current = 'delete';
             showPinInput(note);
          } else {
             deleteNote(noteId);
          }
      }},
    ]);
  };

  const handleToggleMark = async (noteId: string, isMarked: boolean) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    await database.write(async () => {
      await note.update((n: any) => {
        n.isMarked = isMarked;
      });
    });
    if (selectedNote?.id === noteId) {
      setSelectedNote(prev => ({
        id: prev?.id,
        title: prev?.title,
        content: prev?.content,
        isSecure: prev?.isSecure,
        audioUri: prev?.audioUri,
        color: (prev as any)?.color,
        illustration: (prev as any)?.illustration,
        createdAt: prev?.createdAt,
        isMarked: isMarked
      }) as any);
    }
  };


  const openEditModal = (note: NoteModel) => {
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content || '');
    setNewNoteSecure(note.isSecure);
    setRecordedAudioUri(note.audioUri || null);
    setNewNoteColor((note as any).color || 'default');
    setNewNoteIllustration((note as any).illustration || 'none');
    setEditingNoteId(note.id);
    setSelectedNote(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteSecure(false);
    setNewNoteColor('default');
    setNewNoteIllustration('none');
    setEditingNoteId(null);
  };

  const deleteNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    await database.write(async () => {
      await note.destroyPermanently();
    });
  };

  const handleExport = async () => {
    try {
      setBackupModalVisible(false);
      const path = await backupService.exportNotes();
      await backupService.shareBackup(path);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo exportar las notas');
    }
  };

  const handleImport = async () => {
    try {
      setBackupModalVisible(false);
      const count = await backupService.pickAndImport();
      if (count > 0) {
        Alert.alert('Importado', `Se importaron ${count} nota${count !== 1 ? 's' : ''} correctamente`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo importar el archivo');
    }
  };

  const handleBackupAction = () => {
    setBackupModalVisible(true);
  };

  // Filtration & Sorting
  const filteredNotes = notes.filter(note => {
    if (filter === 'marked' && !note.isMarked) return false;
    if (filter === 'secure' && !note.isSecure) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = note.title?.toLowerCase().includes(query);
      const contentMatch = note.content?.toLowerCase().includes(query);
      return titleMatch || contentMatch;
    }
    return true;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isMarked && !b.isMarked) return -1;
    if (!a.isMarked && b.isMarked) return 1;
    return 0;
  });

  const handlePickBackground = async () => {
    try {
      console.log('Solicitando permisos de biblioteca de medios...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Necesitamos acceso a tu galería para poder cambiar el fondo de pantalla.'
        );
        return;
      }

      console.log('Abriendo selector de imágenes...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.9,
      });

      console.log('Resultado del selector:', JSON.stringify(result));

      if (result.canceled) {
        console.log('El usuario canceló la selección o la edición.');
        Alert.alert('Selección cancelada', 'No se seleccionó ninguna imagen o se canceló el recorte.');
        return;
      }

      if (result.assets && result.assets[0] && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        console.log('URI seleccionada:', uri);
        await setCustomBackground(uri);
        console.log('Fondo actualizado con éxito.');
        Alert.alert('Éxito', 'Fondo de pantalla aplicado correctamente.');
      } else {
        console.log('No se encontraron assets en el resultado.');
        Alert.alert('Error', 'No se pudo obtener la imagen seleccionada.');
      }
    } catch (e: any) {
      console.error('Error selecting image:', e);
      Alert.alert('Error', `Hubo un problema al seleccionar la imagen: ${e.message || e}`);
    }
  };

  const handleRemoveBackground = async () => {
    await setCustomBackground(null);
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    
    try {
      const { getSecureCredential } = require('./src/notes/encryption');
      const storedKey = await getSecureCredential('app_ai_key');
      const storedProvider = await getSecureCredential('app_ai_provider') as AIProvider || 'gemini';
      
      if (!storedKey) {
        Alert.alert('Configuración IA', 'Debes configurar tu API Key de IA primero en el menú hamburguesa.');
        setAiConfigModal(true);
        setIsAiLoading(false);
        return;
      }

      const res = await AIService.ask(aiPrompt, storedKey, storedProvider);
      if (res.error) {
        Alert.alert('Error IA', res.error);
      } else if (res.text) {
        setNewNoteContent(prev => prev + (prev ? '\n\n' : '') + res.text);
        setAiPrompt('');
        setActiveToolbar(null);
      }
    } catch (e: any) {
      console.log('Error AI', e);
      Alert.alert('Error', 'Hubo un error de red al contactar al servidor de IA.');
    }
    setIsAiLoading(false);
  };

  const startAiRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso al micrófono para grabar audios.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 127,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });
      await newRecording.startAsync();
      setAiRecording(newRecording);
      setIsAiRecording(true);
    } catch (err) {
      console.error('Failed to start AI recording', err);
      Alert.alert('Error', 'No se pudo iniciar la grabación de audio.');
    }
  };

  const stopAiRecording = async () => {
    try {
      if (!aiRecording) return;
      setIsAiRecording(false);
      setIsAiLoading(true);
      await aiRecording.stopAndUnloadAsync();
      const uri = aiRecording.getURI();
      setAiRecording(null);

      if (uri) {
        const { getSecureCredential } = require('./src/notes/encryption');
        const storedKey = await getSecureCredential('app_ai_key');
        const storedProvider = await getSecureCredential('app_ai_provider') as AIProvider || 'gemini';

        if (!storedKey) {
          Alert.alert('Configuración IA', 'Debes configurar tu API Key de IA primero.');
          setAiConfigModal(true);
          setIsAiLoading(false);
          return;
        }

        const res = await AIService.transcribe(uri, storedKey, storedProvider);
        if (res.error) {
          Alert.alert('Error de Transcripción', res.error);
        } else if (res.text) {
          setAiPrompt(res.text);
        }
      }
    } catch (err) {
      console.error('Failed to stop AI recording', err);
    }
    setIsAiLoading(false);
  };

  const handleInsertImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Necesitamos acceso a tu galería para poder insertar imágenes.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled) return;

      if (result.assets && result.assets[0] && result.assets[0].uri) {
        const selectedUri = result.assets[0].uri;
        const extension = selectedUri.split('.').pop() || 'jpg';
        const localFileName = `image_${Date.now()}.${extension}`;
        const localUri = FileSystem.documentDirectory + localFileName;

        await FileSystem.copyAsync({
          from: selectedUri,
          to: localUri,
        });

        const markdownTag = `\n![Imagen](${localUri})\n`;
        const { start, end } = currentSelectionRef.current;
        const text = newNoteContent;
        
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newContent = before + markdownTag + after;
        
        setNewNoteContent(newContent);
        const newCursorPos = start + markdownTag.length;
        setTextSelection({ start: newCursorPos, end: newCursorPos });
      }
    } catch (e) {
      console.error('[ImagePicker] Error al insertar imagen:', e);
      Alert.alert('Error', 'No se pudo cargar la imagen.');
    }
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    try {
      const num = parseInt(cleanHex, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return hex;
    }
  };

  // Views
  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={COLORS.bunkerBg} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  const content = (
    <>
      <View style={{ flexDirection: 'row', flex: 1, backgroundColor: customBackground ? 'transparent' : COLORS.bunkerBg }}>
      {/* Sidebar (Tablet/Desktop) */}
      {width >= 768 && (
        <View style={{
          width: 260,
          backgroundColor: COLORS.surface,
          borderRightWidth: 1,
          borderColor: COLORS.border,
          paddingTop: Platform.OS === 'android' ? 40 : 20,
          paddingHorizontal: 16,
          justifyContent: 'space-between',
          paddingBottom: 24,
        }}>
          <View>
            {/* Logo / Brand */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 30, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 24 }}>🛡️</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.bunkerDark, fontFamily: COLORS.fontFamily }}>Bunker Notas</Text>
            </View>

            {/* Filters */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.bunkerGray, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4, fontFamily: COLORS.fontFamily }}>Filtros</Text>
            {(['all', 'marked', 'secure'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: filter === f ? COLORS.bunkerBg : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4
                }}
                onPress={() => setFilter(f)}
              >
                <MaterialIcons
                  name={f === 'all' ? 'description' : f === 'marked' ? 'star' : 'lock'}
                  size={20}
                  color={filter === f ? COLORS.bunkerAccent : COLORS.bunkerDark}
                  style={{ marginRight: 12 }}
                />
                <Text style={{
                  color: filter === f ? COLORS.bunkerAccent : COLORS.bunkerDark,
                  fontWeight: filter === f ? '700' : '500',
                  fontSize: 14,
                  fontFamily: COLORS.fontFamily
                }}>
                  {f === 'all' ? 'Todas' : f === 'marked' ? 'Marcadas' : 'Seguras'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 20 }} />

            {/* Themes Section */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.bunkerGray, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4, fontFamily: COLORS.fontFamily }}>Temas</Text>
            <View style={{ gap: 4 }}>
              {(['classic', 'classic_dark', 'emerald', 'light', 'dark'] as ThemeType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: theme === t ? COLORS.bunkerBg : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onPress={() => setTheme(t)}
                >
                  <Text style={{
                    color: theme === t ? COLORS.bunkerAccent : COLORS.bunkerDark,
                    fontSize: 13,
                    fontWeight: theme === t ? '600' : '400',
                    textTransform: 'capitalize',
                    fontFamily: COLORS.fontFamily
                  }}>
                    {t}
                  </Text>
                  {theme === t && <MaterialIcons name="check" size={14} color={COLORS.bunkerAccent} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sidebar Footer (Background Controls) */}
          <View>
            <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 16 }} />
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
                gap: 10,
                backgroundColor: COLORS.bunkerBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                justifyContent: 'center',
                marginBottom: 8
              }}
              onPress={handlePickBackground}
            >
              <MaterialIcons name="image" size={18} color={COLORS.bunkerDark} />
              <Text style={{ color: COLORS.bunkerDark, fontSize: 13, fontWeight: '600', fontFamily: COLORS.fontFamily }}>Subir Fondo</Text>
            </TouchableOpacity>

            {customBackground && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  gap: 10,
                  backgroundColor: COLORS.secureBg,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
                onPress={handleRemoveBackground}
              >
                <MaterialIcons name="no-photography" size={18} color={COLORS.bunkerAccent} />
                <Text style={{ color: COLORS.bunkerAccent, fontSize: 13, fontWeight: '600', fontFamily: COLORS.fontFamily }}>Quitar Fondo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
                gap: 10,
                backgroundColor: COLORS.bunkerBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                justifyContent: 'center',
              }}
              onPress={handleBackupAction}
            >
              <MaterialIcons name="backup" size={18} color={COLORS.bunkerDark} />
              <Text style={{ color: COLORS.bunkerDark, fontSize: 13, fontWeight: '600', fontFamily: COLORS.fontFamily }}>Respaldar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <SafeAreaView style={[styles.feedContainer, { flex: 1, backgroundColor: customBackground ? 'transparent' : COLORS.bunkerBg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: customBackground ? 'transparent' : COLORS.surface, borderBottomColor: customBackground ? 'transparent' : COLORS.border, paddingBottom: 10, paddingTop: Platform.OS === 'android' ? 48 : 24, marginTop: '10%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Logo de Bunker Notas (Image) */}
            <Image 
              source={require('./assets/icon.png')} 
              style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20,
              }} 
            />

            {/* Barra de Búsqueda (Gray Input) */}
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.bunkerBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              paddingHorizontal: 12,
              height: 48,
            }}>
              <MaterialIcons name="search" size={18} color={COLORS.bunkerGray} style={{ marginRight: 6 }} />
              <TextInput
                style={{
                  flex: 1,
                  color: COLORS.text,
                  fontSize: 15,
                  fontFamily: COLORS.fontFamily,
                  paddingVertical: 8,
                }}
                placeholder="Buscar Notas"
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="cancel" size={16} color={COLORS.bunkerGray} />
                </TouchableOpacity>
              )}
            </View>

            {/* Burger Menu Button (Yellow theme/action group inside) */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.bunkerBg,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
              onPress={() => setShowBurgerMenu(true)}
            >
              <MaterialIcons name="menu" size={22} color={COLORS.bunkerDark} />
            </TouchableOpacity>

            {/* Floating Burger Menu Modal Dropdown */}
            <Modal visible={showBurgerMenu} transparent animationType="fade" onRequestClose={() => setShowBurgerMenu(false)}>
              <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }} onPress={() => setShowBurgerMenu(false)}>
                <Pressable style={{ 
                  backgroundColor: COLORS.surface, 
                  borderColor: COLORS.border,
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? 100 : 80,
                  right: 16,
                  width: 220,
                  borderRadius: 16,
                  borderWidth: 1,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 5,
                }}>
                  {/* Note Layout Toggle */}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: 'transparent',
                      marginBottom: 4
                    }}
                    onPress={() => {
                      const newMode = viewMode === 'list' ? 'grid' : 'list';
                      setViewMode(newMode);
                      AsyncStorage.setItem('@bunker_view_mode', newMode).catch(e => console.log(e));
                      setShowBurgerMenu(false);
                    }}
                  >
                    <MaterialIcons name={viewMode === 'list' ? 'grid-view' : 'view-list'} size={18} color={COLORS.bunkerDark} />
                    <Text style={{ color: COLORS.bunkerDark, fontSize: 13, fontFamily: COLORS.fontFamily, fontWeight: '500' }}>
                      Vista: {viewMode === 'list' ? 'Cuadrícula' : 'Lista'}
                    </Text>
                  </TouchableOpacity>

                  {/* Backup / Import */}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: 'transparent',
                      marginBottom: 8
                    }}
                    onPress={() => {
                      setShowBurgerMenu(false);
                      handleBackupAction();
                    }}
                  >
                    <MaterialIcons name="backup" size={18} color={COLORS.bunkerDark} />
                    <Text style={{ color: COLORS.bunkerDark, fontSize: 13, fontFamily: COLORS.fontFamily, fontWeight: '500' }}>
                      Respaldar / Importar
                    </Text>
                  </TouchableOpacity>

                  {/* AI Config */}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: 'transparent',
                      marginBottom: 8
                    }}
                    onPress={() => {
                      setShowBurgerMenu(false);
                      setAiConfigModal(true);
                    }}
                  >
                    <MaterialIcons name="android" size={18} color={COLORS.bunkerDark} />
                    <Text style={{ color: COLORS.bunkerDark, fontSize: 13, fontFamily: COLORS.fontFamily, fontWeight: '500' }}>
                      Configurar IA
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 8 }} />

                  {/* Themes section */}
                  <Text style={{ 
                    fontFamily: COLORS.fontFamily,
                    fontSize: 11, 
                    fontWeight: 'bold', 
                    color: COLORS.bunkerGray, 
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    paddingLeft: 8
                  }}>
                    Tema
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, marginBottom: 8 }}>
                    {(['classic', 'classic_dark', 'emerald', 'light', 'dark'] as ThemeType[]).map((t) => {
                      let leftColor = '#A0AEC0';
                      let rightColor = '#A0AEC0';

                      if (t === 'classic') {
                        leftColor = '#FFFFFF';
                        rightColor = '#E94560';
                      } else if (t === 'classic_dark') {
                        leftColor = '#212529';
                        rightColor = '#E94560';
                      } else if (t === 'emerald') {
                        leftColor = '#FFFFFF';
                        rightColor = '#059669';
                      } else if (t === 'light') {
                        leftColor = '#FFFFFF';
                        rightColor = '#007AFF';
                      } else if (t === 'dark') {
                        leftColor = '#000000';
                        rightColor = '#0A84FF';
                      }

                      const isSelected = theme === t;

                      return (
                        <TouchableOpacity
                          key={t}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            borderWidth: 2,
                            borderColor: isSelected ? COLORS.bunkerAccent : (isDark ? '#4A5568' : '#CBD5E0'),
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                          onPress={() => {
                            setTheme(t);
                            setShowBurgerMenu(false);
                          }}
                        >
                          {/* Two halves split vertically */}
                          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
                            <View style={{ flex: 1, backgroundColor: leftColor }} />
                            <View style={{ flex: 1, backgroundColor: rightColor }} />
                          </View>

                          {isSelected && (
                            <MaterialIcons 
                              name="check" 
                              size={14} 
                              color={(t === 'light' || leftColor === '#FFFFFF') ? '#000' : '#fff'} 
                              style={{ zIndex: 1 }} 
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 8 }} />

                  {/* Custom Background Actions */}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                    onPress={async () => {
                      setShowBurgerMenu(false);
                      await handlePickBackground();
                    }}
                  >
                    <MaterialIcons name="image" size={18} color={COLORS.bunkerDark} />
                    <Text style={{ color: COLORS.bunkerDark, fontSize: 13, fontFamily: COLORS.fontFamily }}>
                      Subir Fondo
                    </Text>
                  </TouchableOpacity>

                  {customBackground && (
                    <TouchableOpacity
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 4
                      }}
                      onPress={async () => {
                        setShowBurgerMenu(false);
                        await handleRemoveBackground();
                      }}
                    >
                      <MaterialIcons name="no-photography" size={18} color={COLORS.bunkerAccent} />
                      <Text style={{ color: COLORS.bunkerAccent, fontSize: 13, fontWeight: '500', fontFamily: COLORS.fontFamily }}>
                        Quitar Fondo
                      </Text>
                    </TouchableOpacity>
                  )}

                </Pressable>
              </Pressable>
            </Modal>

          </View>
        </View>

        {/* Filters (Mobile only) */}
        {width < 768 && (
          <View style={[
            styles.filterContainer, 
            { 
              backgroundColor: customBackground ? 'transparent' : COLORS.surface, 
              borderColor: customBackground ? 'transparent' : COLORS.border,
              borderBottomWidth: 1,
              marginTop: 16,
              paddingVertical: 10,
              justifyContent: 'center',
              alignItems: 'center'
            }
          ]}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 16, width: '100%' }}>
              {(['all', 'marked', 'secure'] as FilterType[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterTab,
                    filter === f 
                      ? { backgroundColor: COLORS.bunkerAccent }
                      : { backgroundColor: COLORS.bunkerBg, borderWidth: 1, borderColor: COLORS.border },
                    { flex: 1, maxWidth: 120, alignItems: 'center', paddingHorizontal: 8 }
                  ]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[
                    styles.filterText,
                    { color: filter === f ? '#fff' : COLORS.bunkerDark },
                  ]}>
                    {f === 'all' ? 'Todas' : f === 'marked' ? 'Marcadas' : 'Seguras'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes Feed */}
        <ScrollView style={styles.notesList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.notesContent}>
          {viewMode === 'grid' ? (
            <View style={styles.gridContainer}>
              {sortedNotes.map((note, index) => {
                const feedWidth = width >= 768 ? width - 260 : width;
                const numColumns = feedWidth < 480 ? 2 : feedWidth < 768 ? 3 : feedWidth < 1024 ? 4 : 5;
                const gridItemWidth = (feedWidth - 32 - (numColumns - 1) * 12) / numColumns;
                return (
                  <View 
                    key={note.id} 
                    style={{ 
                      width: gridItemWidth, 
                      marginRight: (index + 1) % numColumns === 0 ? 0 : 12, 
                      marginBottom: 12 
                    }}
                  >
                    <NoteCard
                      note={note as any}
                      onPress={handleNotePress}
                      onLongPress={handleNoteLongPress}
                      onToggleMark={handleToggleMark}
                      onAuthRequired={(_: any, id: string) => handleNotePress(id)}
                      isGridMode
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            sortedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note as any}
                onPress={handleNotePress}
                onLongPress={handleNoteLongPress}
                onToggleMark={handleToggleMark}
                onAuthRequired={(_: any, id: string) => handleNotePress(id)}
                isGridMode={false}
              />
            ))
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: COLORS.bunkerAccent, shadowColor: COLORS.bunkerAccent }]}
          onPress={() => {
            setNewNoteTitle('');
            setNewNoteContent('');
            setNewNoteSecure(false);
            setEditingNoteId(null);
            setShowCreateModal(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>

    {/* CREATE MODAL */}
      <Modal visible={showCreateModal} animationType="slide" transparent={false} presentationStyle="fullScreen" onRequestClose={handleCloseCreateModal} statusBarTranslucent={true}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {showCreateModal && (
              <View style={[styles.modalContent, { backgroundColor: COLORS.surface, flex: 1, padding: 0 }]}>
                {/* Header Minimal */}
                <View style={[styles.modalHeader, { paddingHorizontal: 16, paddingTop: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <TouchableOpacity onPress={handleCloseCreateModal} style={{ padding: 8 }}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.bunkerDark} />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={{ 
                        padding: 8, 
                        backgroundColor: newNoteSecure ? COLORS.bunkerAccent : 'transparent', 
                        borderRadius: 8,
                        opacity: (editingNoteId && notes.find(n => n.id === editingNoteId)?.isSecure) ? 0.4 : 1
                      }}
                      onPress={toggleSecureNote}
                      disabled={!!(editingNoteId && notes.find(n => n.id === editingNoteId)?.isSecure)}
                    >
                      <MaterialIcons name={newNoteSecure ? "lock" : "lock-outline"} size={26} color={newNoteSecure ? "#fff" : COLORS.bunkerAccent} />
                    </TouchableOpacity>

                    {!isRecording && !recordedAudioUri && (
                      <TouchableOpacity 
                        style={{ padding: 8 }}
                        onPress={startRecording}
                      >
                        <MaterialIcons name="mic-none" size={26} color={COLORS.bunkerAccent} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 8, paddingTop: 6 }}>
                  <TextInput
                    style={[{
                      fontFamily: COLORS.fontFamily, 
                      fontSize: 20, 
                      fontWeight: 'bold', 
                      flex: undefined, 
                      marginBottom: 6, 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                      paddingHorizontal: 16, 
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 0, 
                      color: COLORS.bunkerDark 
                    }]}
                    placeholder="Título"
                    placeholderTextColor={COLORS.textMuted}
                    value={newNoteTitle}
                    onChangeText={setNewNoteTitle}
                    onFocus={handleInputFocus}
                    autoFocus
                  />

                  {(isRecording || recordedAudioUri) && (
                    <View style={[styles.audioPanel, { backgroundColor: COLORS.bunkerBg, borderColor: COLORS.border, marginBottom: 6, paddingVertical: 8 }]}>
                      {isRecording ? (
                        <View style={styles.audioRow}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.pulsingDot} />
                            <Text style={[styles.audioText, { color: COLORS.bunkerDark }]}>Grabando... {formatTime(recordingDuration)}</Text>
                          </View>
                          <TouchableOpacity 
                            style={[styles.audioIconBtn, { backgroundColor: COLORS.bunkerAccent }]} 
                            onPress={stopRecording}
                          >
                            <MaterialIcons name="pause" size={24} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.audioRow}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="mic" size={20} color={COLORS.bunkerAccent} />
                            <Text style={[styles.audioText, { color: COLORS.bunkerDark }]}>Nota de voz grabada</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity 
                               style={[styles.audioIconBtn, { backgroundColor: COLORS.bunkerAccent }]} 
                              onPress={() => handlePlayAudio(recordedAudioUri!)}
                            >
                              <MaterialIcons name={isPlaybackPlaying ? 'pause' : 'play-arrow'} size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.audioIconBtn, { backgroundColor: COLORS.bunkerBg, borderWidth: 1, borderColor: COLORS.border }]} 
                              onPress={cleanupAudio}
                            >
                              <MaterialIcons name="delete-outline" size={24} color={COLORS.bunkerAccent} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                    <TextInput
                      ref={contentInputRef}
                      style={[{
                        fontFamily: COLORS.fontFamily,
                        fontSize: 16,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderRadius: 12,
                        padding: 16,
                        paddingBottom: 40,
                        color: COLORS.bunkerDark,
                        textAlignVertical: 'top',
                        flex: 1,
                      }]}
                    placeholder="Nota"
                    placeholderTextColor={COLORS.textMuted}
                    multiline={true}
                    value={newNoteContent}
                    onChangeText={setNewNoteContent}
                    onFocus={handleInputFocus}
                    onSelectionChange={(e) => {
                      currentSelectionRef.current = e.nativeEvent.selection;
                      if (textSelection !== undefined) {
                        setTextSelection(undefined);
                      }
                    }}
                    {...(textSelection ? { selection: textSelection } : {})}
                  />

                  <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
                    Los estilos visuales se aplicarán al guardar la nota.
                  </Text>
                </View>

                {/* Expandable Toolbars (Above Bottom Action Bar) */}
                {activeToolbar === 'format' && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bunkerBg }}>
                    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 12, color: COLORS.textMuted, marginRight: -4 }}>Formato:</Text>
                      
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }} onPress={() => insertMarkdown('bold')}>
                        <Text style={{ fontFamily: COLORS.fontFamily, fontWeight: 'bold', color: COLORS.bunkerDark, fontSize: 14 }}>B</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }} onPress={() => insertMarkdown('italic')}>
                        <Text style={{ fontFamily: COLORS.fontFamily, fontStyle: 'italic', color: COLORS.bunkerDark, fontSize: 14 }}>I</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }} onPress={() => insertMarkdown('underline')}>
                        <Text style={{ fontFamily: COLORS.fontFamily, textDecorationLine: 'underline', color: COLORS.bunkerDark, fontSize: 14 }}>U</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }} onPress={() => insertMarkdown('list')}>
                        <Text style={{ fontFamily: COLORS.fontFamily, color: COLORS.bunkerDark, fontSize: 14 }}>• Lista</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                )}

                {activeToolbar === 'color' && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bunkerBg }}>
                    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 12, color: COLORS.textMuted, marginRight: -4 }}>Color:</Text>
                      {Object.keys(NOTE_COLORS).map((colorKey) => {
                        const c = NOTE_COLORS[colorKey];
                        const isSelected = newNoteColor === colorKey;
                        const circleColor = colorKey === 'default' ? (isDark ? '#2D3748' : '#EDF2F7') : (isDark ? c.dark : c.light);
                        return (
                          <TouchableOpacity key={colorKey} onPress={() => setNewNoteColor(colorKey)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: circleColor, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? COLORS.bunkerAccent : (isDark ? '#4A5568' : '#CBD5E0'), justifyContent: 'center', alignItems: 'center' }}>
                            {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.bunkerAccent }} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {activeToolbar === 'doodle' && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bunkerBg, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 }}>
                    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 12, color: COLORS.textMuted, marginRight: -4 }}>Doodle:</Text>
                      {Object.keys(NOTE_ILLUSTRATIONS).map((illusKey) => {
                        const emoji = NOTE_ILLUSTRATIONS[illusKey];
                        const isSelected = newNoteIllustration === illusKey;
                        return (
                          <TouchableOpacity key={illusKey} onPress={() => setNewNoteIllustration(illusKey)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: isSelected ? COLORS.bunkerAccent : COLORS.surface, borderWidth: 1, borderColor: isSelected ? 'transparent' : COLORS.border }}>
                            <Text style={{ fontSize: 20 }}>{illusKey === 'none' ? '🚫' : emoji}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {activeToolbar === 'ai' && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bunkerBg }}>
                    <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>Asistente IA (Zero-Knowledge):</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput 
                         style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, padding: 8, color: COLORS.text, fontFamily: COLORS.fontFamily }} 
                         placeholder={isAiRecording ? "Escuchando audio..." : "Ej: Escribe un resumen de la reunión..."} 
                         placeholderTextColor={COLORS.textMuted}
                         value={aiPrompt}
                         onChangeText={setAiPrompt}
                         editable={!isAiLoading && !isAiRecording}
                      />
                      <TouchableOpacity 
                         style={{ marginLeft: 8, padding: 8, backgroundColor: isAiRecording ? '#E53E3E' : COLORS.bunkerBg, borderRadius: 8, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}
                         onPress={isAiRecording ? stopAiRecording : startAiRecording}
                         disabled={isAiLoading}
                      >
                         <MaterialIcons name={isAiRecording ? "stop" : "mic"} size={20} color={isAiRecording ? "#fff" : COLORS.bunkerDark} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                         style={{ marginLeft: 8, padding: 8, backgroundColor: COLORS.bunkerAccent, borderRadius: 8, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                         onPress={handleAiSubmit}
                         disabled={isAiLoading || isAiRecording || !aiPrompt.trim()}
                      >
                         {isAiLoading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={20} color="#fff" />}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Bottom Action Bar */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity 
                      style={{ padding: 8, marginBottom: 5, backgroundColor: activeToolbar === 'format' ? COLORS.bunkerAccent : 'transparent', borderRadius: 8 }}
                      onPress={() => setActiveToolbar(activeToolbar === 'format' ? null : 'format')}
                    >
                      <MaterialIcons name="text-format" size={26} color={activeToolbar === 'format' ? "#fff" : COLORS.bunkerAccent} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{ padding: 8, marginLeft: 8, marginBottom: 5, backgroundColor: activeToolbar === 'color' ? COLORS.bunkerAccent : 'transparent', borderRadius: 8 }}
                      onPress={() => setActiveToolbar(activeToolbar === 'color' ? null : 'color')}
                    >
                      <MaterialIcons name="color-lens" size={26} color={activeToolbar === 'color' ? "#fff" : COLORS.bunkerAccent} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{ padding: 8, marginLeft: 8, marginBottom: 5, backgroundColor: activeToolbar === 'doodle' ? COLORS.bunkerAccent : 'transparent', borderRadius: 8 }}
                      onPress={() => setActiveToolbar(activeToolbar === 'doodle' ? null : 'doodle')}
                    >
                      <MaterialIcons name="emoji-emotions" size={26} color={activeToolbar === 'doodle' ? "#fff" : COLORS.bunkerAccent} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{ padding: 8, marginLeft: 8, marginBottom: 5, backgroundColor: activeToolbar === 'ai' ? COLORS.bunkerAccent : 'transparent', borderRadius: 8 }}
                      onPress={() => setActiveToolbar(activeToolbar === 'ai' ? null : 'ai')}
                    >
                      <MaterialIcons name="android" size={26} color={activeToolbar === 'ai' ? "#fff" : COLORS.bunkerAccent} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={{ padding: 8, marginBottom: 5, borderRadius: 8 }}
                    onPress={handleInsertImage}
                  >
                    <MaterialIcons name="photo-library" size={26} color={COLORS.bunkerAccent} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* VIEWER MODAL */}
      <Modal visible={!!selectedNote} animationType="slide" transparent onRequestClose={handleCloseViewer}>
        <View style={styles.viewerOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCloseViewer} />
          {selectedNote && (
            <View style={[styles.viewerContent, { backgroundColor: COLORS.surface }]}>
              <>
                <View style={styles.viewerHeader}>
                  <View style={styles.viewerTitleRow}>
                    {(selectedNote as any).color && (selectedNote as any).color !== 'default' && (
                      <View style={{
                        width: 12, height: 12, borderRadius: 6,
                        backgroundColor: isDark
                          ? NOTE_COLORS[(selectedNote as any).color]?.dark
                          : NOTE_COLORS[(selectedNote as any).color]?.light,
                        marginRight: 4,
                      }} />
                    )}
                    <Text style={[{fontFamily: COLORS.fontFamily}, styles.viewerTitle, { color: COLORS.bunkerDark }]}>{selectedNote.title}</Text>
                    {selectedNote.isSecure && (
                      <View style={[styles.viewerSecureBadge, { backgroundColor: COLORS.bunkerBg }]}>
                        <Text style={styles.viewerSecureIcon}>🔒</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => openEditModal(selectedNote)}>
                    <Text style={[styles.viewerClose, { color: COLORS.bunkerAccent, fontSize: 16, marginRight: 16, marginTop: 4 }]}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCloseViewer}>
                    <Text style={[styles.viewerClose, { color: COLORS.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                {selectedNote.audioUri ? (
                  <View style={[styles.viewerPlayer, { backgroundColor: COLORS.bunkerBg, borderColor: COLORS.border }]}>
                    <Text style={[styles.viewerPlayerTitle, { color: COLORS.bunkerDark }]}>🎙️ Nota de Voz</Text>
                    <View style={styles.viewerPlayerControls}>
                      <TouchableOpacity 
                        style={[styles.viewerPlayBtn, { backgroundColor: COLORS.bunkerAccent }]} 
                        onPress={() => handlePlayAudio(decryptedAudioUri || selectedNote.audioUri)}
                      >
                        <Text style={styles.viewerPlayBtnText}>
                          {isPlaybackPlaying ? '⏸ Pausa' : '▶ Reproducir'}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { backgroundColor: COLORS.border }]}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { 
                                backgroundColor: COLORS.bunkerAccent, 
                                width: playbackDuration > 0 ? `${(playbackPosition / playbackDuration) * 100}%` : '0%' 
                              }
                            ]} 
                          />
                        </View>
                        <View style={styles.progressLabels}>
                          <Text style={[styles.progressTime, { color: COLORS.bunkerGray }]}>{formatMs(playbackPosition)}</Text>
                          <Text style={[styles.progressTime, { color: COLORS.bunkerGray }]}>{formatMs(playbackDuration)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}

                <ScrollView style={styles.viewerBody}>
                  <RenderHtml
                    contentWidth={width - 48}
                    source={{ html: markdownToHtml(selectedNote.content || '') }}
                    baseStyle={{
                      color: COLORS.bunkerDark,
                      fontSize: 16,
                      lineHeight: 24,
                      fontFamily: COLORS.fontFamily,
                    }}
                    tagsStyles={{
                      strong: { fontWeight: 'bold', color: COLORS.bunkerDark },
                      b: { fontWeight: 'bold', color: COLORS.bunkerDark },
                      em: { fontStyle: 'italic' },
                      i: { fontStyle: 'italic' },
                      u: { textDecorationLine: 'underline' },
                      li: { color: COLORS.bunkerDark, fontSize: 16, lineHeight: 24 },
                    }}
                  />
                </ScrollView>

                <View style={[styles.viewerFooter, { borderColor: COLORS.border }]}>
                  <Text style={[styles.viewerDate, { color: COLORS.textMuted }]}>
                    {selectedNote.createdAt ? new Date(selectedNote.createdAt).toLocaleDateString('es-ES', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    }) : ''}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      handleToggleMark(selectedNote.id, !selectedNote.isMarked);
                    }}
                  >
                    <Text style={{ fontSize: 28, color: selectedNote.isMarked ? COLORS.bunkerAccent : COLORS.textMuted }}>
                      {selectedNote.isMarked ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            </View>
          )}
        </View>
      </Modal>

      {/* PIN MODAL ESTILO BANCO GALICIA */}
      <Modal visible={pinModalVisible} animationType="slide" transparent onRequestClose={() => setPinModalVisible(false)}>
        <Pressable style={styles.pinModalOverlay} onPress={() => setPinModalVisible(false)}>
          <Pressable style={[styles.pinModalContent, { backgroundColor: COLORS.surface }]} onPress={() => {}}>
            <Text style={[styles.pinModalTitle, { color: COLORS.bunkerDark }]}>
              {hasStoredPin ? '🔐 Ingresá tu PIN' : '🛡️ ¡Creá tu PIN Maestro!'}
            </Text>
            <Text style={[styles.pinModalSubtitle, { color: COLORS.bunkerGray }]}>
              {hasStoredPin 
                ? 'Ingresá tu PIN de seguridad para las notas.' 
                : 'Aún no tenés un PIN. Ingresá entre 4 y 6 dígitos para definirlo ahora:'
              }
            </Text>
            
            {/* Contenedor Visual de PIN Boxes (Responsive) */}
            <View style={styles.pinModalBoxContainer}>
              {Array.from({ length: 6 }).map((_, index) => {
                const isDigitEntered = index < pinInput.length;
                return (
                  <View
                    key={index}
                    style={[
                      styles.pinModalBox,
                      { borderColor: COLORS.border, backgroundColor: COLORS.surface },
                      isDigitEntered && { borderColor: COLORS.bunkerDark },
                    ]}
                  >
                    <Text style={[styles.pinModalBoxText, isDigitEntered && { color: COLORS.bunkerDark }]}>
                      {isDigitEntered ? '•' : ''}
                    </Text>
                  </View>
                );
              })}

              <TextInput
                style={styles.pinModalHiddenInput}
                value={pinInput}
                onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                autoFocus
              />
            </View>

            {isBiometricAvailable && (
              <TouchableOpacity
                testID="biometric-trigger-button"
                style={[styles.pinModalBiometricBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
                onPress={() => pendingNote && tryBiometricAuth(pendingNote)}
              >
                <MaterialIcons name="fingerprint" size={24} color={COLORS.bunkerAccent} />
                <Text style={[styles.pinModalBiometricText, { color: COLORS.bunkerDark }]}>Desbloquear con Biometría</Text>
              </TouchableOpacity>
            )}

            <View style={styles.pinModalActions}>
              <TouchableOpacity 
                style={[styles.pinModalCancel, { backgroundColor: COLORS.bunkerBg }]} 
                onPress={() => {
                  setPinModalVisible(false);
                  setPendingNote(null);
                }}
              >
                <Text style={[styles.pinModalCancelText, { color: COLORS.bunkerGray }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinModalVerify, { backgroundColor: COLORS.bunkerAccent }]}
                onPress={validatePinAndOpen}
              >
                <Text style={styles.pinModalVerifyText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* BACKUP MODAL */}
      <Modal visible={backupModalVisible} animationType="fade" transparent onRequestClose={() => setBackupModalVisible(false)}>
        <Pressable style={styles.pinModalOverlay} onPress={() => setBackupModalVisible(false)}>
          <Pressable style={[styles.pinModalContent, { backgroundColor: COLORS.surface }]} onPress={() => {}}>
            <Text style={[styles.pinModalTitle, { color: COLORS.bunkerDark, marginBottom: 8 }]}>
              Respaldo de Notas
            </Text>
            <Text style={[styles.pinModalSubtitle, { color: COLORS.bunkerGray, marginBottom: 24 }]}>
              Elegí qué querés hacer con tus notas seguras.
            </Text>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                backgroundColor: COLORS.bunkerBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginBottom: 12,
                gap: 12
              }}
              onPress={handleExport}
            >
              <MaterialIcons name="file-upload" size={24} color={COLORS.bunkerAccent} />
              <View>
                <Text style={{ color: COLORS.bunkerDark, fontSize: 16, fontWeight: '700', fontFamily: COLORS.fontFamily }}>Exportar notas</Text>
                <Text style={{ color: COLORS.bunkerGray, fontSize: 13, fontFamily: COLORS.fontFamily }}>Crear un archivo encriptado .bunker</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                backgroundColor: COLORS.bunkerBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginBottom: 24,
                gap: 12
              }}
              onPress={handleImport}
            >
              <MaterialIcons name="file-download" size={24} color={COLORS.bunkerAccent} />
              <View>
                <Text style={{ color: COLORS.bunkerDark, fontSize: 16, fontWeight: '700', fontFamily: COLORS.fontFamily }}>Importar notas</Text>
                <Text style={{ color: COLORS.bunkerGray, fontSize: 13, fontFamily: COLORS.fontFamily }}>Restaurar desde un archivo .bunker</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                backgroundColor: COLORS.bunkerBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                width: '100%',
                gap: 8
              }}
              onPress={() => setBackupModalVisible(false)}
            >
              <MaterialIcons name="close" size={20} color={COLORS.bunkerGray} />
              <Text style={{ color: COLORS.bunkerDark, fontSize: 16, fontWeight: '600', fontFamily: COLORS.fontFamily }}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* AI CONFIG MODAL */}
      <Modal visible={aiConfigModal} transparent animationType="fade" onRequestClose={() => setAiConfigModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAiConfigModal(false)} />
          <View style={{ backgroundColor: COLORS.surface, width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 20, color: COLORS.text, fontWeight: '700', marginBottom: 16, textAlign: 'center' }}>Configuración de IA</Text>
            
            <Text style={{ color: COLORS.textMuted, marginBottom: 8, fontFamily: COLORS.fontFamily, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' }}>Proveedor</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
              <TouchableOpacity onPress={() => setAiProvider('gemini')} style={{ flex: 1, padding: 12, backgroundColor: aiProvider === 'gemini' ? COLORS.bunkerAccent : COLORS.bunkerBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: aiProvider === 'gemini' ? 'transparent' : COLORS.border }}>
                <Text style={{ color: aiProvider === 'gemini' ? '#fff' : COLORS.text, fontFamily: COLORS.fontFamily, fontWeight: '700' }}>Gemini</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAiProvider('openai')} style={{ flex: 1, padding: 12, backgroundColor: aiProvider === 'openai' ? COLORS.bunkerAccent : COLORS.bunkerBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: aiProvider === 'openai' ? 'transparent' : COLORS.border }}>
                <Text style={{ color: aiProvider === 'openai' ? '#fff' : COLORS.text, fontFamily: COLORS.fontFamily, fontWeight: '700' }}>OpenAI</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: COLORS.textMuted, marginBottom: 8, fontFamily: COLORS.fontFamily, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' }}>API Key (Local y Cifrada)</Text>
            <TextInput 
              style={{ backgroundColor: COLORS.bunkerBg, color: COLORS.text, padding: 14, borderRadius: 12, fontFamily: COLORS.fontFamily, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, fontSize: 15 }}
              placeholder="Pegá tu API Key acá"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              value={aiKey}
              onChangeText={setAiKey}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setAiConfigModal(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.bunkerBg, borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ color: COLORS.text, fontFamily: COLORS.fontFamily, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                try {
                  const { storeSecureCredential } = require('./src/notes/encryption');
                  await storeSecureCredential('app_ai_provider', aiProvider);
                  if (aiKey) await storeSecureCredential('app_ai_key', aiKey);
                  setAiConfigModal(false);
                  Alert.alert('Éxito', 'Configuración de IA guardada de forma segura.');
                } catch (e: any) {
                  Alert.alert('Error', 'No se pudo guardar la configuración.');
                }
              }} style={{ flex: 1, paddingVertical: 14, backgroundColor: COLORS.bunkerAccent, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontFamily: COLORS.fontFamily, fontWeight: '700' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bunkerBg }]}>
      {customBackground && (
        <Image
          source={{ uri: customBackground }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}
      <View style={[styles.container, customBackground ? { backgroundColor: hexToRgba(COLORS.bunkerBg, 0.5) } : null]}>
        <StatusBar 
          style={isDark ? 'light' : 'dark'} 
          backgroundColor={customBackground ? 'transparent' : COLORS.surface} 
          translucent={!!customBackground} 
        />
        {content}
      </View>
    </View>
  );
};

const enhance = withObservables([], () => ({
  notes: database.collections.get<NoteModel>('notes').query().observe(),
}));

const EnhancedAppContent = enhance(AppContent);

export default function App() {
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

  return (
    <ThemeProvider>
      <ShareIntentProvider>
        <EnhancedAppContent />
      </ShareIntentProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  feedContainer: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 16, paddingBottom: 16, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  viewToggle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  viewToggleIcon: { fontSize: 20 },
  filterContainer: { paddingVertical: 12, borderBottomWidth: 1 },
  filterScroll: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  filterText: { fontSize: 14, fontWeight: '500' },
  notesList: { flex: 1 },
  notesContent: { padding: 16, paddingBottom: 100 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  bottomSpacer: { height: 100 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center', shadowColor: '#E94560', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { fontSize: 32, color: '#fff', fontWeight: '300', textAlign: 'center', lineHeight: 34 },
  modalOverlay: { flex: 1 },
  modalContent: { flex: 1, padding: 24, paddingTop: 40, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '700' },
  modalClose: { fontSize: 24, padding: 4 },
  modalInput: { borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 12, fontWeight: '600' },
  modalTextArea: { flex: 1, fontSize: 16, fontWeight: '400' },
  secureToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginTop: 'auto' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#1A202C', borderColor: '#1A202C' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  secureLabel: { fontSize: 16, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20, paddingBottom: 20 },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#E94560', alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  viewerOverlay: { flex: 1 },
  viewerContent: { flex: 1, width: '100%', padding: 24, paddingTop: 40 },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  viewerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewerTitle: { fontSize: 28, fontWeight: '700', flex: 1 },
  viewerSecureBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  viewerSecureIcon: { fontSize: 14 },
  viewerClose: { fontSize: 28, padding: 4 },
  viewerBody: { flex: 1, marginBottom: 20 },
  viewerText: { fontSize: 18, lineHeight: 28 },
  viewerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, paddingBottom: 20 },
  viewerDate: { fontSize: 14 },
  pinModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 20, paddingTop: 80 },
  pinModalContent: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, alignItems: 'center' },
  pinModalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  pinModalSubtitle: { fontSize: 14, marginBottom: 24 },
  pinModalBoxContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 24, position: 'relative' },
  pinModalBox: { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  pinModalBoxText: { fontSize: 24 },
  pinModalHiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0, fontSize: 1 },
  pinModalBiometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, width: '100%', marginBottom: 20, gap: 10 },
  pinModalBiometricText: { fontSize: 15, fontWeight: '600' },
  pinModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  pinModalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  pinModalCancelText: { fontSize: 16, fontWeight: '600' },
  pinModalVerify: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  pinModalVerifyText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Audio styles
  audioPanel: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  audioText: { fontSize: 14, fontWeight: '500' },
  pulsingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E94560' },
  startRecordBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#1A202C', alignItems: 'center' },
  startRecordBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  stopRecordBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#E94560' },
  playRecordBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  discardRecordBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#718096' },
  audioBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  discardBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  audioIconBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  // Viewer player styles
  viewerPlayer: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16, width: '100%' },
  viewerPlayerTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  viewerPlayerControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewerPlayBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  viewerPlayBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  progressContainer: { flex: 1, gap: 4 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTime: { fontSize: 10 },
});