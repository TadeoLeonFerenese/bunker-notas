/**
 * NoteCard Component - Soporta modo lista y grid (cuadrados)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';

export interface Note {
  id: string;
  title: string;
  content: string;
  isSecure: boolean;
  isMarked: boolean;
  audioUri?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NoteCardProps {
  note: Note;
  onPress: (noteId: string) => void;
  onLongPress: (noteId: string) => void;
  onToggleMark?: (noteId: string, isMarked: boolean) => void;
  onAuthRequired?: (type: string, noteId: string) => void;
  isGridMode?: boolean;
}

export function NoteCard({
  note,
  onPress,
  onLongPress,
  onToggleMark,
  onAuthRequired,
  isGridMode = false,
}: NoteCardProps) {
  const { COLORS, isDark } = useTheme();

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
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
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
          { backgroundColor: COLORS.cardBg, borderColor: COLORS.border },
          note.isSecure && { backgroundColor: COLORS.secureBg, borderColor: COLORS.accent },
        ]}
        activeOpacity={0.7}
      >
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
        { backgroundColor: COLORS.cardBg, borderColor: COLORS.border },
        note.isSecure && stylesList.secureCard,
      ]}
      activeOpacity={0.7}
    >
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