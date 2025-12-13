import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// CONFIGURAÇÃO OBRIGATÓRIA ATUALIZADA
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <--- ADICIONADO
    shouldShowList: true,   // <--- ADICIONADO
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Permissão de notificação negada!');
      return null;
    }
    
    // Tenta pegar o ID do projeto do app.json (necessário para o Expo Go/Builds recentes)
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenData.data;
      console.log('Token gerado:', token);
    } catch (e) {
      console.error(e);
    }
  } else {
    console.log('Emulador: Push Notifications não funcionam aqui.');
  }

  return token;
}

// Função para enviar notificação (usada no TreinosListScreen)
export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: { someData: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}