import React from 'react';
import { render } from '@testing-library/react-native';
import { NoteCard } from '../../src/notes/NoteCard';
import { BlurView } from 'expo-blur';
import { ThemeProvider } from '../../src/theme/ThemeContext';

describe('NoteCard Component (Visuals & Security)', () => {
  const secureNote = {
    id: '1',
    title: 'Secure Password',
    content: 'My secret content',
    isSecure: true,
    isMarked: false,
  };

  const normalNote = {
    id: '2',
    title: 'Grocery List',
    content: 'Buy milk',
    isSecure: false,
    isMarked: false,
  };

  it('Mandate 4: Symmetrical Design - secure notes must use BlurView and Padlock', () => {
    const { getByText, UNSAFE_getByType, queryByText } = render(
      <ThemeProvider>
        <NoteCard 
          note={secureNote} 
          onPress={() => {}} 
          onLongPress={() => {}} 
          isGridMode={false} 
        />
      </ThemeProvider>
    );

    // Verificamos el texto seguro dummy
    expect(getByText('Este contenido está protegido localmente...')).toBeTruthy();
    
    // Verificamos que NO expone el contenido real
    expect(queryByText('My secret content')).toBeNull();

    // Verificamos que está presente el componente BlurView
    const blurView = UNSAFE_getByType(BlurView);
    expect(blurView).toBeTruthy();

    // Verificamos el ícono de candado (usamos el emoji que ya estaba implementado)
    expect(getByText('🔒')).toBeTruthy();
  });

  it('Normal notes should show their content normally without BlurView', () => {
    const { getByText, UNSAFE_queryByType, queryByText } = render(
      <ThemeProvider>
        <NoteCard 
          note={normalNote} 
          onPress={() => {}} 
          onLongPress={() => {}} 
          isGridMode={false} 
        />
      </ThemeProvider>
    );

    // Contenido real expuesto
    expect(getByText('Buy milk')).toBeTruthy();

    // Sin BlurView
    expect(UNSAFE_queryByType(BlurView)).toBeNull();
    expect(queryByText('🔒')).toBeNull();
  });
});