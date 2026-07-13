import * as Keychain from 'react-native-keychain';

const PIN_SERVICE = 'com.tadeoleon.bunkernotas.pin';
const USERNAME = 'bunker_user';

export class PinManager {
  /**
   * Verifica si ya existe un PIN guardado en el dispositivo.
   */
  static async hasPin(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: PIN_SERVICE });
      return !!credentials;
    } catch (error) {
      console.error('Error verificando PIN:', error);
      return false;
    }
  }

  /**
   * Guarda un nuevo PIN en el almacenamiento seguro.
   * @param pin El PIN numérico de 4 a 6 dígitos a guardar.
   */
  static async setPin(pin: string): Promise<boolean> {
    try {
      // Validamos formato estricto: numérico y longitud (exactamente 6 dígitos)
      if (!/^\d{6}$/.test(pin)) {
        throw new Error('El PIN debe ser numérico y contener exactamente 6 dígitos.');
      }
      
      await Keychain.setGenericPassword(USERNAME, pin, { service: PIN_SERVICE });
      return true;
    } catch (error) {
      console.error('Error guardando PIN:', error);
      return false;
    }
  }

  /**
   * Verifica si el PIN ingresado coincide con el guardado en el dispositivo.
   * @param inputPin El PIN ingresado por el usuario.
   */
  static async verifyPin(inputPin: string): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: PIN_SERVICE });
      if (credentials) {
        return credentials.password === inputPin;
      }
      return false;
    } catch (error) {
      console.error('Error verificando PIN:', error);
      return false;
    }
  }

  /**
   * Borra el PIN guardado (útil para resets o pruebas).
   */
  static async resetPin(): Promise<boolean> {
    try {
      return await Keychain.resetGenericPassword({ service: PIN_SERVICE });
    } catch (error) {
      console.error('Error reseteando PIN:', error);
      return false;
    }
  }
}
