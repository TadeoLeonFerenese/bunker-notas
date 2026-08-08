import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

// Configuración de cómo se muestran las notificaciones cuando la app está abierta
// Configuración de cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export class ReminderService {
  /**
   * Configura el canal de notificaciones prioritario en Android (Android 8+ / API 26+).
   */
  static async setupNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('bunker_reminders', {
          name: 'Recordatorios de Búnker',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch (error) {
        console.error("Error al configurar el canal de notificaciones en Android:", error);
      }
    }
  }

  /**
   * Solicita permisos de notificaciones locales.
   */
  static async requestNotificationPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    await this.setupNotificationChannel();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  /**
   * Solicita permisos para acceder al calendario nativo.
   */
  static async requestCalendarPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const { status: existingStatus } = await Calendar.getCalendarPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  /**
   * Obtiene o crea un calendario exclusivo de la app en el dispositivo nativo.
   */
  private static async getOrCreateBunkerCalendar(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existingCalendar = calendars.find(cal => cal.name === 'Bunker Notes');
    
    if (existingCalendar) {
      return existingCalendar.id;
    }

    // Si no existe, crear uno nuevo
    if (Platform.OS === 'ios') {
      const defaultCalendar = calendars.find(cal => cal.allowsModifications);
      if (!defaultCalendar) return null;
      
      // En iOS podemos usar el calendario por defecto o crear uno
      return defaultCalendar.id;
    } else {
      // En Android necesitamos crear una cuenta y fuente de calendario
      const details = {
        title: 'Bunker Notes',
        color: '#8B5CF6',
        entityType: Calendar.EntityTypes.EVENT,
        source: {
          isLocalAccount: true,
          name: 'Bunker Notes Account',
          type: 'LOCAL',
        },
        name: 'Bunker Notes',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      };
      try {
        return await Calendar.createCalendarAsync(details);
      } catch (error) {
        console.error("Error creando calendario en Android", error);
        return null;
      }
    }
  }

  /**
   * Programa una notificación local y opcionalmente un evento en el calendario.
   * Retorna un objeto con el notificationId (que en expo-notifications es el noteId o un hash único)
   * y el calendarEventId si fue creado.
   */
  static async scheduleReminder(
    noteId: string,
    title: string,
    body: string,
    triggerDate: Date,
    syncWithCalendar: boolean
  ): Promise<{ notificationId: string | null; calendarEventId: string | null }> {
    let notificationId: string | null = null;
    let calendarEventId: string | null = null;

    if (Platform.OS === 'web') {
      return { notificationId, calendarEventId };
    }

    // 1. Programar Notificación Local
    const hasNotificationPermission = await this.requestNotificationPermissions();
    if (hasNotificationPermission) {
      try {
        // Asegurar que el canal de notificaciones en Android esté creado
        await this.setupNotificationChannel();

        // Cancelamos cualquier notificación previa para esta nota antes de crear una nueva
        await this.cancelNotification(noteId);

        // Programar la alerta de una sola vez
        notificationId = await Notifications.scheduleNotificationAsync({
          identifier: noteId, // Usamos el noteId como identificador para cancelarlo fácil
          content: {
            title: title || 'Recordatorio del Búnker',
            body: body || 'Toca para abrir tu nota segura.',
            data: { noteId },
            sound: true,
          },
          trigger: Platform.OS === 'android'
            ? ({ channelId: 'bunker_reminders', date: triggerDate } as any)
            : triggerDate,
        });
      } catch (error) {
        console.error("Error programando notificación", error);
      }
    }

    // 2. Programar Evento de Calendario
    if (syncWithCalendar) {
      const hasCalendarPermission = await this.requestCalendarPermissions();
      if (hasCalendarPermission) {
        try {
          const calendarId = await this.getOrCreateBunkerCalendar();
          if (calendarId) {
            const endDate = new Date(triggerDate.getTime() + 60 * 60 * 1000); // 1 hora de duración por defecto
            
            calendarEventId = await Calendar.createEventAsync(calendarId, {
              title: title || 'Recordatorio de Bunker Notes',
              startDate: triggerDate,
              endDate: endDate,
              notes: body,
              timeZone: 'GMT',
            });
          }
        } catch (error) {
          console.error("Error creando evento de calendario", error);
        }
      }
    }

    return { notificationId, calendarEventId };
  }

  /**
   * Cancela una notificación local específica.
   */
  static async cancelNotification(noteId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(noteId);
    } catch (error) {
      console.error("Error cancelando notificación", error);
    }
  }

  /**
   * Elimina un evento del calendario nativo.
   */
  static async cancelCalendarEvent(calendarEventId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Calendar.deleteEventAsync(calendarEventId);
    } catch (error) {
      console.error("Error eliminando evento de calendario", error);
    }
  }

  /**
   * Limpia tanto la notificación como el evento del calendario asociados a una nota.
   */
  static async clearAllReminders(noteId: string, calendarEventId?: string): Promise<void> {
    await this.cancelNotification(noteId);
    if (calendarEventId) {
      await this.cancelCalendarEvent(calendarEventId);
    }
  }
}
