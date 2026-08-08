import { ReminderService } from '../../src/notes/ReminderService';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';

describe('ReminderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should request notification permissions successfully', async () => {
    const granted = await ReminderService.requestNotificationPermissions();
    expect(granted).toBe(true);
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
  });

  it('Should request calendar permissions successfully', async () => {
    const granted = await ReminderService.requestCalendarPermissions();
    expect(granted).toBe(true);
    expect(Calendar.getCalendarPermissionsAsync).toHaveBeenCalled();
  });

  it('Should schedule a local notification and calendar event', async () => {
    const triggerDate = new Date(Date.now() + 60000);
    const result = await ReminderService.scheduleReminder(
      'note-123',
      'Test Title',
      'Test Body',
      triggerDate,
      true
    );

    expect(result.notificationId).toBe('mock-notification-id');
    expect(result.calendarEventId).toBe('mock-event-id');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'note-123',
        content: expect.objectContaining({
          title: 'Test Title',
          body: 'Test Body',
        }),
      })
    );
  });

  it('Should setup Android notification channel with high priority', async () => {
    const { Platform } = require('react-native');
    const originalOS = Platform.OS;
    Platform.OS = 'android';

    await ReminderService.setupNotificationChannel();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'bunker_reminders',
      expect.objectContaining({
        name: 'Recordatorios de Búnker',
        importance: Notifications.AndroidImportance.MAX,
      })
    );

    Platform.OS = originalOS;
  });

  it('Should cancel notification and calendar events', async () => {
    await ReminderService.clearAllReminders('note-123', 'event-456');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('note-123');
    expect(Calendar.deleteEventAsync).toHaveBeenCalledWith('event-456');
  });
});
