/**
 * NoteCard Component - Soporta modo lista y grid (cuadrados)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { withObservables } from '@nozbe/watermelondb/react';

export interface Note {
  id: string;
  title: string;
  content: string;
  isSecure: boolean;
  isMarked: boolean;
  audioUri?: string;
  color?: string;
  illustration?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const NOTE_COLORS: Record<string, { light: string; dark: string; name: string }> = {
  default: { light: 'transparent', dark: 'transparent', name: 'Predeterminado' },
  red: { light: '#FF9E9E', dark: '#6A1E1E', name: 'Rojo' },
  orange: { light: '#FFC78A', dark: '#733B0A', name: 'Naranja' },
  yellow: { light: '#FFF099', dark: '#6E620B', name: 'Amarillo' },
  green: { light: '#B8E8B8', dark: '#1F4F1F', name: 'Verde' },
  teal: { light: '#A3E8D9', dark: '#0F5247', name: 'Celeste' },
  blue: { light: '#A8C6FA', dark: '#1A396B', name: 'Azul' },
  purple: { light: '#D4B4D4', dark: '#462146', name: 'Púrpura' },
  pink: { light: '#FFB5D6', dark: '#731C41', name: 'Rosa' },
};

export const NOTE_ILLUSTRATIONS: Record<string, string> = {
  none: '',
  pencil: '📝',
  idea: '💡',
  work: '💼',
  home: '🏠',
  cart: '🛒',
  money: '💰',
  music: '🎵',
  heart: '❤️',
  gym: '🏋️',
};

export interface NoteCardProps {
  note: Note;
  onPress: (noteId: string) => void;
  onLongPress: (noteId: string) => void;
  onToggleMark?: (noteId: string, isMarked: boolean) => void;
  onAuthRequired?: (type: string, noteId: string) => void;
  isGridMode?: boolean;
}

const NoteCardBase = ({
  note,
  onPress,
  onLongPress,
  onToggleMark,
  onAuthRequired,
  isGridMode = false,
}: NoteCardProps) => {
  const { COLORS, isDark } = useTheme();

  const noteColorKey = note.color || 'default';
  const customCardBg = NOTE_COLORS[noteColorKey] ? (isDark ? NOTE_COLORS[noteColorKey].dark : NOTE_COLORS[noteColorKey].light) : 'transparent';
  const cardBgStyle = customCardBg !== 'transparent' ? { backgroundColor: customCardBg } : { backgroundColor: COLORS.cardBg };
  const illustrationEmoji = note.illustration && NOTE_ILLUSTRATIONS[note.illustration] ? NOTE_ILLUSTRATIONS[note.illustration] : null;

  const handlePress = () => {
    if (note.isSecure) {
      onAuthRequired?.('secure-note', note.id);
    } else {
      onPress(note.id);
    }
  };

  const handleToggleMark = (e: any) => {
    e.stopPropagation();
    onToggleMark?.(note.id, !note.isMarked);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    });
  };

  const stripHtml = (html?: string) => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/[\*_~`]/g, '')
      .trim();
  };

  if (isGridMode) {
    // Vista de cuadrícula (cuadrados)
    return (
      <TouchableOpacity
        testID="note-card"
        onPress={handlePress}
        onLongPress={() => onLongPress(note.id)}
        style={[
          stylesGrid.card,
          cardBgStyle,
          { borderColor: COLORS.border },
          note.isSecure && {
          borderLeftWidth: 4,
          borderLeftColor: noteColorKey !== 'default' ? (isDark ? NOTE_COLORS[noteColorKey].light : NOTE_COLORS[noteColorKey].dark) : COLORS.bunkerAccent,
          borderColor: noteColorKey !== 'default' ? (isDark ? NOTE_COLORS[noteColorKey].light : NOTE_COLORS[noteColorKey].dark) : COLORS.bunkerAccent,
          borderWidth: 1.5,
          shadowColor: noteColorKey !== 'default' ? (isDark ? NOTE_COLORS[noteColorKey].light : NOTE_COLORS[noteColorKey].dark) : COLORS.bunkerAccent,
          shadowOffset: { width: -2, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 6,
        }
        ]}
        activeOpacity={0.7}
      >
        {illustrationEmoji && (
          <Text style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            fontSize: 54,
            opacity: 0.5,
            zIndex: 0,
          }}>
            {illustrationEmoji}
          </Text>
        )}
        <View style={stylesGrid.header}>
          <Text style={[{fontFamily: COLORS.fontFamily}, stylesGrid.title, { color: COLORS.text }]} numberOfLines={2}>
            {note.title}
          </Text>
          {note.isSecure && <Text style={stylesGrid.secureIcon}>🔒</Text>}
        </View>
        {note.content ? (
          <View style={{ flex: 1, overflow: 'hidden', borderRadius: 4 }}>
            <Text style={[{fontFamily: COLORS.fontFamily}, stylesGrid.content, { color: COLORS.textSecondary }]} numberOfLines={3}>
              {note.isSecure ? 'Este contenido está protegido localmente...' : stripHtml(note.content)}
            </Text>
            {note.isSecure && (
              <BlurView intensity={isDark ? 80 : 50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            )}
          </View>
        ) : null}
        <View style={stylesGrid.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {note.audioUri && (
              <View style={[stylesGrid.audioBadge, { backgroundColor: isDark ? '#4A5568' : '#EBF8FF' }]}>
                <Text style={{ fontSize: 9 }}>🎙️</Text>
              </View>
            )}
            <Text style={[stylesGrid.date, { color: COLORS.textMuted }]}>{formatDate(note.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={handleToggleMark} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[stylesGrid.star, note.isMarked && { color: COLORS.accent }]}>
              {note.isMarked ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // Vista de lista (rectángulos)
  return (
    <TouchableOpacity
      testID="note-card"
      onPress={handlePress}
      onLongPress={() => onLongPress(note.id)}
      style={[
        stylesList.card,
        cardBgStyle,
        { borderColor: COLORS.border },
        note.isSecure && {
          borderLeftWidth: 4,
          borderLeftColor: noteColorKey !== 'default' ? (isDark ? NOTE_COLORS[noteColorKey].light : NOTE_COLORS[noteColorKey].dark) : COLORS.bunkerAccent,
          borderColor: noteColorKey !== 'default' ? (isDark ? NOTE_COLORS[noteColorKey].light : NOTE_COLORS[noteColorKey].dark) : COLORS.bunkerAccent,
          borderWidth: 1.5,
          shadowColor: noteColorKey !== 'default' ? (isDark ? NOTE_COLORS[noteColorKey].light : NOTE_COLORS[noteColorKey].dark) : COLORS.bunkerAccent,
          shadowOffset: { width: -2, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 6,
        }
      ]}
      activeOpacity={0.7}
    >
      {illustrationEmoji && (
        <Text style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          fontSize: 64,
          opacity: 0.5,
          zIndex: 0,
        }}>
          {illustrationEmoji}
        </Text>
      )}
      <View style={stylesList.headerRow}>
        <View style={stylesList.titleContainer}>
          <Text style={[{fontFamily: COLORS.fontFamily}, stylesList.title, { color: COLORS.text }]} numberOfLines={2}>
            {note.title}
          </Text>
        </View>
        <View style={stylesList.actions}>
          {note.isSecure && (
            <View style={[stylesList.secureBadge, { backgroundColor: COLORS.secureBg }]}>
              <Text style={{ fontSize: 12 }}>🔒</Text>
            </View>
          )}
          <TouchableOpacity
            testID="star-button"
            onPress={handleToggleMark}
            style={stylesList.starButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[stylesList.starIcon, note.isMarked && { color: COLORS.accent }]}>
              {note.isMarked ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {note.content ? (
        <View style={{ overflow: 'hidden', borderRadius: 4, marginBottom: 8 }}>
          <Text style={[{fontFamily: COLORS.fontFamily}, stylesList.content, { color: COLORS.textSecondary, marginBottom: 0 }]} numberOfLines={3}>
            {note.isSecure ? 'Este contenido está protegido localmente...' : stripHtml(note.content)}
          </Text>
          {note.isSecure && (
            <BlurView intensity={isDark ? 80 : 50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          )}
        </View>
      ) : null}

      <View style={stylesList.footer}>
        <View style={stylesList.meta}>
          {note.audioUri && (
            <View style={[stylesList.audioBadge, { backgroundColor: isDark ? '#4A5568' : '#EBF8FF', borderColor: isDark ? '#4A5568' : '#BEE3F8', borderWidth: 1 }]}>
              <Text style={[stylesList.audioText, { color: isDark ? '#E2E8F0' : '#2B6CB0' }]}>🎙️ Nota de Audio</Text>
            </View>
          )}
          <Text style={[stylesList.date, { color: COLORS.textMuted }]}>{formatDate(note.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const stylesList = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1 },
  secureCard: { borderLeftWidth: 4, borderLeftColor: '#E94560' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titleContainer: { flex: 1, marginRight: 8 },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secureBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  starButton: { padding: 4 },
  starIcon: { fontSize: 20, color: '#A0AEC0' },
  content: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  audioText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 12 },
});

const stylesGrid = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 14, fontWeight: '600', lineHeight: 18, flex: 1 },
  secureIcon: { fontSize: 10, marginLeft: 4 },
  content: { fontSize: 12, lineHeight: 16, marginBottom: 8, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  date: { fontSize: 10 },
  star: { fontSize: 16, color: '#A0AEC0' },
  audioBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
});

export const NoteCard = withObservables(['note'], ({ note }: { note: any }) => ({
  note: note.observe(),
}))(NoteCardBase);