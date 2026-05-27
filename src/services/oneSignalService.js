import { OneSignal, LogLevel } from 'react-native-onesignal';
import Config from 'react-native-config';

const ONESIGNAL_APP_ID = Config.ONESIGNAL_APP_ID || 'YOUR_ONESIGNAL_APP_ID';

export async function initOneSignal() {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') {
    console.warn('OneSignal: no ONESIGNAL_APP_ID configured en .env');
    return;
  }

  OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  OneSignal.initialize(ONESIGNAL_APP_ID);

  OneSignal.Notifications.addEventListener('click', (event) => {
    console.log('OneSignal: notification opened', event.notification);
    // Aqui puedes navegar o procesar el payload si necesitas abrir una pantalla especifica.
  });

  OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
    const notification = event.getNotification();
    console.log('OneSignal: notification will show in foreground', notification);
    notification.display();
  });

  const accepted = await OneSignal.Notifications.requestPermission(true);
  console.log('OneSignal push permission accepted:', accepted);

  OneSignal.User.pushSubscription.addEventListener('change', (event) => {
    console.log('OneSignal subscription changed', event.current);
  });

  OneSignal.User.pushSubscription.getIdAsync().then((id) => {
    console.log('OneSignal subscription id:', id);
  });

  OneSignal.User.pushSubscription.getTokenAsync().then((token) => {
    console.log('OneSignal push token:', token);
  });
}

export async function setOneSignalExternalUserId(userId) {
  if (!userId) return;

  try {
    OneSignal.login(String(userId));
    console.log('OneSignal external user id set', userId);
  } catch (error) {
    console.warn('OneSignal setExternalUserId error', error);
  }
}

export async function removeOneSignalExternalUserId() {
  try {
    OneSignal.logout();
    console.log('OneSignal external user id removed');
  } catch (error) {
    console.warn('OneSignal removeExternalUserId error', error);
  }
}

export async function sendOneSignalTags(tags = {}) {
  try {
    OneSignal.User.addTags(tags);
    console.log('OneSignal tags sent', tags);
  } catch (error) {
    console.warn('OneSignal sendTags error', error);
  }
}
