import { OneSignal, LogLevel } from 'react-native-onesignal';
import Config from 'react-native-config';

const ONESIGNAL_APP_ID =
  Config.ONESIGNAL_APP_ID || 'YOUR_ONESIGNAL_APP_ID';

console.log('OneSignal DEBUG Config:', Config);
console.log(
  'OneSignal DEBUG APP ID:',
  Config.ONESIGNAL_APP_ID
);

let oneSignalInitPromise = null;
let oneSignalInitialized = false;

const hasValidOneSignalConfig = () => {
  return (
    ONESIGNAL_APP_ID &&
    ONESIGNAL_APP_ID !== 'YOUR_ONESIGNAL_APP_ID'
  );
};

/**
 * Inicializa OneSignal una sola vez.
 *
 * Esta función es la encargada de garantizar que
 * OneSignal.initialize() haya sido llamado antes de
 * utilizar login(), addEmail(), addTags(), etc.
 */
export function initOneSignal() {
  if (!hasValidOneSignalConfig()) {
    console.warn(
      'OneSignal: no ONESIGNAL_APP_ID configured en .env'
    );
    return Promise.resolve(false);
  }

  if (oneSignalInitPromise) {
    return oneSignalInitPromise;
  }

  oneSignalInitPromise = (async () => {
    try {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);

      /**
       * IMPORTANTE:
       * initialize() debe ocurrir antes de cualquier
       * OneSignal.login().
       */
      OneSignal.initialize(ONESIGNAL_APP_ID);

      oneSignalInitialized = true;

      console.log('OneSignal: initialized');

      /**
       * Eventos
       */
      OneSignal.Notifications.addEventListener(
        'click',
        (event) => {
          console.log(
            'OneSignal: notification opened',
            event.notification
          );

          // Aquí puedes navegar o procesar el payload
          // si necesitas abrir una pantalla específica.
        }
      );

      OneSignal.Notifications.addEventListener(
        'foregroundWillDisplay',
        (event) => {
          try {
            const notification = event.getNotification();

            console.log(
              'OneSignal: notification will show in foreground',
              notification
            );

            notification.display();
          } catch (error) {
            console.warn(
              'OneSignal foreground notification error',
              error
            );
          }
        }
      );

      /**
       * Permiso de notificaciones.
       *
       * Esto NO debe bloquear el funcionamiento de
       * login/email de OneSignal.
       */
      try {
        const accepted =
          await OneSignal.Notifications.requestPermission(true);

        console.log(
          'OneSignal push permission accepted:',
          accepted
        );
      } catch (error) {
        console.warn(
          'OneSignal requestPermission error',
          error
        );
      }

      /**
       * Subscription listener
       */
      try {
        OneSignal.User.pushSubscription.addEventListener(
          'change',
          (event) => {
            console.log(
              'OneSignal subscription changed',
              event.current
            );
          }
        );
      } catch (error) {
        console.warn(
          'OneSignal subscription listener error',
          error
        );
      }

      /**
       * Subscription ID
       */
      try {
        const id =
          await OneSignal.User.pushSubscription.getIdAsync();

        console.log(
          'OneSignal subscription id:',
          id
        );
      } catch (error) {
        console.warn(
          'OneSignal get subscription id error',
          error
        );
      }

      /**
       * Push token
       */
      try {
        const token =
          await OneSignal.User.pushSubscription.getTokenAsync();

        console.log(
          'OneSignal push token:',
          token
        );
      } catch (error) {
        console.warn(
          'OneSignal get push token error',
          error
        );
      }

      return true;
    } catch (error) {
      console.warn(
        'OneSignal initialization error',
        error
      );

      oneSignalInitialized = false;

      return false;
    }
  })();

  return oneSignalInitPromise;
}

/**
 * Garantiza que OneSignal esté inicializado antes
 * de realizar cualquier operación sobre el usuario.
 */
async function ensureOneSignalReady() {
  if (!hasValidOneSignalConfig()) {
    return false;
  }

  /**
   * Si App.tsx todavía no inicializó OneSignal,
   * lo inicializamos aquí mismo.
   */
  if (!oneSignalInitPromise) {
    initOneSignal();
  }

  try {
    const initialized = await oneSignalInitPromise;

    if (!initialized || !oneSignalInitialized) {
      console.warn(
        'OneSignal: service is not initialized'
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      'OneSignal ensure ready error',
      error
    );
    return false;
  }
}

export async function setOneSignalExternalUserId(userId) {
  if (!userId) return;

  try {
    const ready = await ensureOneSignalReady();

    if (!ready) {
      console.warn(
        'OneSignal: login skipped because OneSignal is not ready'
      );
      return;
    }

    OneSignal.login(String(userId));

    console.log(
      'OneSignal external user id set',
      userId
    );
  } catch (error) {
    console.warn(
      'OneSignal setExternalUserId error',
      error
    );
  }
}

export async function removeOneSignalExternalUserId() {
  try {
    const ready = await ensureOneSignalReady();

    if (!ready) {
      console.warn(
        'OneSignal: logout skipped because OneSignal is not ready'
      );
      return;
    }

    OneSignal.logout();

    console.log(
      'OneSignal external user id removed'
    );
  } catch (error) {
    console.warn(
      'OneSignal removeExternalUserId error',
      error
    );
  }
}

export async function sendOneSignalTags(tags = {}) {
  try {
    const ready = await ensureOneSignalReady();

    if (!ready) {
      console.warn(
        'OneSignal: tags skipped because OneSignal is not ready'
      );
      return;
    }

    OneSignal.User.addTags(tags);

    console.log(
      'OneSignal tags sent',
      tags
    );
  } catch (error) {
    console.warn(
      'OneSignal sendTags error',
      error
    );
  }
}

export async function setOneSignalEmail(email) {
  if (!email) return;

  const normalizedEmail =
    String(email).trim().toLowerCase();

  if (
    !normalizedEmail ||
    !normalizedEmail.includes('@')
  ) {
    return;
  }

  try {
    const ready = await ensureOneSignalReady();

    if (!ready) {
      console.warn(
        'OneSignal: email skipped because OneSignal is not ready'
      );
      return;
    }

    OneSignal.User.addEmail(normalizedEmail);

    console.log(
      'OneSignal email set',
      normalizedEmail
    );
  } catch (error) {
    console.warn(
      'OneSignal setEmail error',
      error
    );
  }
}