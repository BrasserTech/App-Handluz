// app/services/notifications.ts
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

// Configura o comportamento das notificações recebidas enquanto o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Registra o dispositivo para receber notificações push e
 * salva o token na tabela public.profiles.
 *
 * profileId = id do perfil logado (UUID da tabela profiles).
 */
export async function registerForPushNotificationsAsync(
  profileId: string | null
): Promise<void> {
  try {
    if (!Device.isDevice) {
      console.log('[notifications] Notificações só funcionam em dispositivo físico.');
      return;
    }

    // Permissões
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[notifications] Permissão de notificações não concedida.');
      return;
    }

    // Obter token Expo
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const expoPushToken = tokenResponse.data;
    console.log('[notifications] Expo push token:', expoPushToken);

    if (!profileId) {
      console.log(
        '[notifications] profileId ausente, não foi possível salvar o token no Supabase.'
      );
      return;
    }

    // Salva o token no Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: expoPushToken })
      .eq('id', profileId);

    if (error) {
      console.error('[notifications] Erro ao salvar push_token:', error.message);
    }

    // Canal Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  } catch (err) {
    console.error('[notifications] Erro no registro de push:', err);
  }
}

/**
 * Envia uma notificação push simples para uma lista de tokens.
 * (Para testes, é suficiente. Em produção, o ideal é um backend.)
 */
async function sendNotificationToTokens(
  tokens: string[],
  title: string,
  body: string
) {
  if (tokens.length === 0) return;

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title,
    body,
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[notifications] Erro ao enviar push:', err);
  }
}

/**
 * Busca todos os push_token cadastrados em profiles
 * e envia uma notificação (pensada para atletas).
 */
export async function notifyAllAthletes(
  title: string,
  body: string
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('push_token')
      .not('push_token', 'is', null);

    if (error) {
      console.error(
        '[notifications] Erro ao buscar tokens de atletas:',
        error.message
      );
      return;
    }

    const tokens =
      (data ?? [])
        .map((row: any) => row.push_token as string)
        .filter(Boolean) ?? [];

    if (tokens.length === 0) {
      console.log('[notifications] Nenhum token de atleta cadastrado.');
      return;
    }

    await sendNotificationToTokens(tokens, title, body);
  } catch (err) {
    console.error('[notifications] Erro ao notificar atletas:', err);
  }
}
