/**
 * AudioRecording.test.ts - Test suite for Audio Recording and Playback (TDD)
 */

import { Audio } from 'expo-av';

// Mock de expo-av
jest.mock('expo-av', () => {
  const mockRecording = {
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    startAsync: jest.fn().mockResolvedValue(undefined),
    stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
    getURI: jest.fn().mockReturnValue('file:///mock/recording-123.m4a'),
  };

  const mockSound = {
    playAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    setOnPlaybackStatusUpdate: jest.fn(),
  };

  return {
    Audio: {
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
      Recording: jest.fn().mockImplementation(() => mockRecording),
      Sound: {
        createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
      },
    },
  };
});

describe('Audio Notes Recording & Playback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should request microphone permissions and return status', async () => {
    const result = await Audio.requestPermissionsAsync();
    expect(Audio.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('granted');
  });

  it('Should handle successful recording lifecycle', async () => {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync();
    await recording.startAsync();
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    expect(recording.prepareToRecordAsync).toHaveBeenCalledTimes(1);
    expect(recording.startAsync).toHaveBeenCalledTimes(1);
    expect(recording.stopAndUnloadAsync).toHaveBeenCalledTimes(1);
    expect(uri).toBe('file:///mock/recording-123.m4a');
  });

  it('Should handle successful playback lifecycle', async () => {
    const uri = 'file:///mock/recording-123.m4a';
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    await sound.stopAsync();
    await sound.unloadAsync();

    expect(Audio.Sound.createAsync).toHaveBeenCalledWith({ uri });
    expect(sound.playAsync).toHaveBeenCalledTimes(1);
    expect(sound.stopAsync).toHaveBeenCalledTimes(1);
    expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
  });
});
