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
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import RenderHtml from 'react-native-render-html';
import { ThemeProvider, useTheme, ThemeType } from './src/theme/ThemeContext';
import { encryption } from './src/notes/encryption';
import { backupService } from './src/backup/BackupService';
import * as Linking from 'expo-linking';
import { useShareIntent } from 'expo-share-intent';

type FilterType = 'all' | 'marked' | 'secure';
type ViewMode = 'list' | 'grid';

export const AppContent = ({ notes }: { notes: NoteModel[] }) => {
  const { width } = useWindowDimensions();
  const { COLORS, isDark, theme, setTheme, customBackground, setCustomBackground } = useTheme();
  const richText = useRef<RichEditor>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteModel | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const authActionRef = useRef<'open' | 'delete'>('open');
  
  // IA Interoperability State
  const [pendingExternalNote, setPendingExternalNote] = useState<{title: string, content: string} | null>(null);
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
    const sharedText = shareIntent?.text || shareIntent?.webUrl;
    if (hasShareIntent && sharedText) {
      setPendingExternalNote({ title: 'Nota Compartida', content: sharedText });
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  // Compuerta de seguridad: Mostrar modal solo si está autenticado
  useEffect(() => {
    if (isAuthenticated && pendingExternalNote) {
      setNewNoteTitle(pendingExternalNote.title);
      setNewNoteContent(pendingExternalNote.content);
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

  // Create Note State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteSecure, setNewNoteSecure] = useState(false);
  const [newNoteColor, setNewNoteColor] = useState('default');
  const [newNoteIllustration, setNewNoteIllustration] = useState('none');

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

  const handleCloseCreateModal = async () => {
    await cleanupAudio();
    closeCreateModal();
  };

  // Auth Handling
  const handleLoginSuccess = () => setIsAuthenticated(true);

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
        await storeSecureCredential('app_pin_hash', hash);
        setHasStoredPin(true);
        Alert.alert('PIN Registrado', 'Has definido tu PIN de seguridad para las notas.');
        
        if (pendingNote) {
          executeAuthAction(pendingNote);
        }
      } else {
        // Validar PIN real contra llavero seguro
        const isValid = await verifyPin(pinInput, storedHash);
        if (isValid) {
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
      setSelectedNote(prev => ({ ...(prev as any), isMarked }) as any);
    }
  };

  const saveNote = async () => {
    if (!newNoteTitle.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    const titleToStore = newNoteTitle.trim();
    const contentToStore = newNoteSecure ? encryption.encrypt(newNoteContent.trim()) : newNoteContent.trim();
    
    await database.write(async () => {
      if (editingNoteId) {
        const note = await database.get<NoteModel>('notes').find(editingNoteId);
        await note.update((n: any) => {
          n.title = titleToStore;
          n.content = contentToStore;
          n.isSecure = newNoteSecure;
          n.audioUri = recordedAudioUri || '';
          n.color = newNoteColor;
          n.illustration = newNoteIllustration;
        });
      } else {
        await database.get<NoteModel>('notes').create((note: any) => {
          note.title = titleToStore;
          note.content = contentToStore;
          note.isSecure = newNoteSecure;
          note.isMarked = false;
          note.audioUri = recordedAudioUri || '';
          note.color = newNoteColor;
          note.illustration = newNoteIllustration;
        });
      }
    });

    handleCloseCreateModal();
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
        <View style={[styles.header, { backgroundColor: customBackground ? 'transparent' : COLORS.surface, borderBottomColor: customBackground ? 'transparent' : COLORS.border }]}>
          <View style={styles.headerTop}>
            <View>
              {width < 768 ? (
                <>
                  <Text style={[{fontFamily: COLORS.fontFamily}, styles.headerTitle, { color: COLORS.bunkerDark }]}>Mis Notas</Text>
                  <Text style={[{fontFamily: COLORS.fontFamily}, styles.headerSubtitle, { color: COLORS.bunkerGray }]}>
                    {notes.length} nota{notes.length !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <Text style={[{fontFamily: COLORS.fontFamily}, styles.headerTitle, { color: COLORS.bunkerDark, fontSize: 24, lineHeight: 30 }]}>
                  {filter === 'all' ? 'Notas' : filter === 'marked' ? 'Marcadas' : 'Seguras'}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1000 }}>
              {width < 768 && (
                <>
                  <TouchableOpacity
                    style={[styles.viewToggle, { backgroundColor: COLORS.bunkerBg }]}
                    onPress={() => setShowThemeMenu(true)}
                  >
                    <MaterialIcons name="palette" size={20} color={COLORS.bunkerGray} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewToggle, { backgroundColor: COLORS.bunkerBg }]}
                    onPress={handleBackupAction}
                  >
                    <MaterialIcons name="backup" size={20} color={COLORS.bunkerGray} />
                  </TouchableOpacity>

                  <Modal visible={showThemeMenu} transparent animationType="fade" onRequestClose={() => setShowThemeMenu(false)}>
                    <Pressable style={{ flex: 1 }} onPress={() => setShowThemeMenu(false)}>
                      <Pressable style={{ 
                        backgroundColor: COLORS.surface, 
                        borderColor: COLORS.border,
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? 100 : 80,
                        right: 24,
                        width: 160,
                        borderRadius: 12,
                        borderWidth: 1,
                        padding: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                      }}>
                        {(['classic', 'classic_dark', 'emerald', 'light', 'dark'] as ThemeType[]).map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: theme === t ? COLORS.bunkerBg : 'transparent',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                            onPress={() => {
                              setTheme(t);
                              setShowThemeMenu(false);
                            }}
                          >
                            <Text style={{ 
                              color: theme === t ? COLORS.bunkerAccent : COLORS.bunkerDark, 
                              fontWeight: theme === t ? '600' : '400',
                              fontFamily: COLORS.fontFamily,
                              fontSize: 13,
                              textTransform: 'capitalize',
                            }}>
                              {t}
                            </Text>
                            {theme === t && (
                              <MaterialIcons name="check" size={14} color={COLORS.bunkerAccent} />
                            )}
                          </TouchableOpacity>
                        ))}

                        <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 4 }} />

                        <TouchableOpacity
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                          onPress={async () => {
                            setShowThemeMenu(false);
                            await handlePickBackground();
                          }}
                        >
                          <MaterialIcons name="image" size={16} color={COLORS.bunkerDark} />
                          <Text style={{ color: COLORS.bunkerDark, fontSize: 13 }}>
                            Subir Fondo
                          </Text>
                        </TouchableOpacity>

                        {customBackground && (
                          <TouchableOpacity
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onPress={async () => {
                              setShowThemeMenu(false);
                              await handleRemoveBackground();
                            }}
                          >
                            <MaterialIcons name="no-photography" size={16} color={COLORS.bunkerAccent} />
                            <Text style={{ color: COLORS.bunkerAccent, fontSize: 13, fontWeight: '500' }}>
                              Quitar Fondo
                            </Text>
                          </TouchableOpacity>
                        )}
                      </Pressable>
                    </Pressable>
                  </Modal>
                </>
              )}
              <TouchableOpacity
                style={[styles.viewToggle, { backgroundColor: COLORS.bunkerBg }]}
                onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              >
                <Text style={[styles.viewToggleIcon, { color: COLORS.bunkerGray }]}>
                  {viewMode === 'list' ? '▦' : '☰'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: customBackground ? 'transparent' : COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.bunkerBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 12,
            height: 44,
          }}>
            <MaterialIcons name="search" size={20} color={COLORS.bunkerGray} style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1,
                color: COLORS.text,
                fontSize: 14,
                fontFamily: COLORS.fontFamily,
                paddingVertical: 8,
              }}
              placeholder="Buscar notas..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="cancel" size={18} color={COLORS.bunkerGray} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters (Mobile only) */}
        {width < 768 && (
          <View style={[styles.filterContainer, { backgroundColor: customBackground ? 'transparent' : COLORS.surface, borderColor: customBackground ? 'transparent' : COLORS.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['all', 'marked', 'secure'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterTab,
                  filter === f 
                    ? { backgroundColor: COLORS.bunkerAccent }
                    : { backgroundColor: COLORS.bunkerBg, borderWidth: 1, borderColor: COLORS.border },
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
          </ScrollView>
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
                      onAuthRequired={(_, id) => handleNotePress(id)}
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
                onAuthRequired={(_, id) => handleNotePress(id)}
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
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={handleCloseCreateModal}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCloseCreateModal} />
          {showCreateModal && (
            <View style={[styles.modalContent, { backgroundColor: COLORS.surface, width: '100%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[{fontFamily: COLORS.fontFamily}, styles.modalTitle, { color: COLORS.bunkerDark }]}>{editingNoteId ? 'Editar Nota' : 'Nueva Nota'}</Text>
                <TouchableOpacity onPress={handleCloseCreateModal}>
                  <Text style={[styles.modalClose, { color: COLORS.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={[{fontFamily: COLORS.fontFamily}, styles.modalInput, { flex: 1, marginBottom: 0, backgroundColor: COLORS.bunkerBg, color: COLORS.bunkerDark }]}
                  placeholder="Título"
                  placeholderTextColor={COLORS.textMuted}
                  value={newNoteTitle}
                  onChangeText={setNewNoteTitle}
                  onFocus={handleInputFocus}
                  autoFocus
                />
                
                <TouchableOpacity 
                  style={{ 
                    width: 52, 
                    height: 52, 
                    backgroundColor: newNoteSecure ? COLORS.bunkerAccent : COLORS.bunkerBg, 
                    borderRadius: 26, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    elevation: newNoteSecure ? 2 : 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: newNoteSecure ? 0.2 : 0,
                    shadowRadius: 2,
                    borderWidth: newNoteSecure ? 0 : 1,
                    borderColor: COLORS.border,
                  }} 
                  onPress={() => setNewNoteSecure(!newNoteSecure)}
                >
                  <MaterialIcons name={newNoteSecure ? "lock" : "lock-open"} size={26} color={newNoteSecure ? "#fff" : COLORS.textMuted} />
                </TouchableOpacity>
                
                {!isRecording && !recordedAudioUri && (
                  <TouchableOpacity 
                    style={{ 
                      width: 52, 
                      height: 52, 
                      backgroundColor: COLORS.bunkerAccent, 
                      borderRadius: 26, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      elevation: 2,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                    }} 
                    onPress={startRecording}
                  >
                    <MaterialIcons name="mic" size={30} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              {(isRecording || recordedAudioUri) && (
                <View style={[styles.audioPanel, { backgroundColor: COLORS.bunkerBg, borderColor: COLORS.border, marginBottom: 12 }]}>
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

              <RichEditor
                ref={richText}
                onChange={setNewNoteContent}
                onFocus={handleInputFocus}
                placeholder="Escribe el contenido de tu nota..."
                initialContentHTML={newNoteContent}
                editorStyle={{
                  backgroundColor: COLORS.bunkerBg,
                  color: COLORS.bunkerDark,
                  placeholderColor: COLORS.textMuted,
                  contentCSSText: 'font-size: 16px; min-height: 250px; height: 100%;',
                }}
                useContainer={true}
                style={{ flex: 1, backgroundColor: COLORS.bunkerBg, borderRadius: 12, marginBottom: 8 }}
              />

              <RichToolbar
                editor={richText}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                  actions.undo,
                  actions.redo,
                ]}
                style={{ backgroundColor: COLORS.bunkerBg, borderRadius: 12, marginBottom: 16 }}
                iconTint={COLORS.bunkerGray}
                selectedIconTint={COLORS.bunkerAccent}
              />

              {/* Controles de personalización (Color y Doodle) */}
              {!isKeyboardVisible && (
                <View style={{
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 16,
                }}>
                  {/* Selector de Colores */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 12, color: COLORS.textMuted, marginRight: 4 }}>Color:</Text>
                    {Object.keys(NOTE_COLORS).map((colorKey) => {
                      const c = NOTE_COLORS[colorKey];
                      const isSelected = newNoteColor === colorKey;
                      const circleColor = colorKey === 'default' ? (isDark ? '#2D3748' : '#EDF2F7') : (isDark ? c.dark : c.light);
                      return (
                        <TouchableOpacity
                          key={colorKey}
                          onPress={() => setNewNoteColor(colorKey)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: circleColor,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? COLORS.bunkerAccent : (isDark ? '#4A5568' : '#CBD5E0'),
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {isSelected && (
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bunkerAccent }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Selector de Doodles/Emojis */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: COLORS.fontFamily, fontSize: 12, color: COLORS.textMuted, marginRight: 4 }}>Doodle:</Text>
                    {Object.keys(NOTE_ILLUSTRATIONS).map((illusKey) => {
                      const emoji = NOTE_ILLUSTRATIONS[illusKey];
                      const isSelected = newNoteIllustration === illusKey;
                      return (
                        <TouchableOpacity
                          key={illusKey}
                          onPress={() => setNewNoteIllustration(illusKey)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                            backgroundColor: isSelected ? COLORS.bunkerAccent : (isDark ? '#2D3748' : '#EDF2F7'),
                            borderWidth: 1,
                            borderColor: isSelected ? 'transparent' : (isDark ? '#4A5568' : '#CBD5E0'),
                          }}
                        >
                          <Text style={{ fontSize: 11, color: isSelected ? '#fff' : COLORS.text }}>
                            {illusKey === 'none' ? 'Ninguno' : emoji}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* AUDIO PANEL MOVED TO TITLE ROW */}

              <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 16 }}>
                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: COLORS.bunkerBg }]} onPress={handleCloseCreateModal}>
                  <Text style={[styles.cancelButtonText, { color: COLORS.bunkerGray }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
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
                        onPress={() => handlePlayAudio(selectedNote.audioUri)}
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
                    source={{ html: selectedNote.content || '' }}
                    baseStyle={{
                      color: COLORS.bunkerDark,
                      fontSize: 16,
                      lineHeight: 24,
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
                    <Text style={{ fontSize: 24 }}>
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
      <EnhancedAppContent />
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