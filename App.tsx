import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DrawerNavigator from './app/navigation/DrawerNavigator';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { AppTheme } from './constants/theme';

function AppContent() {
  const { loading } = useAuth();

  // Mostra loading enquanto restaura o estado de autenticação
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppTheme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <DrawerNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const origin = window.location.origin;
    const originalError = console.error;

    function serializeArg(arg: unknown) {
      if (arg instanceof Error) {
        return { name: arg.name, message: arg.message, stack: arg.stack };
      }
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }

    function sendLog(level: 'error' | 'warn' | 'log', args: unknown[], meta?: Record<string, unknown>) {
      const payload = {
        level,
        args: args.map(serializeArg),
        meta: meta ?? {},
        timestamp: new Date().toISOString(),
      };
      fetch(`${origin}/api/client-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    console.error = (...args: unknown[]) => {
      originalError(...args);
      sendLog('error', args);
    };

    const onError = (event: ErrorEvent) => {
      sendLog('error', [event.message], { stack: event.error?.stack, filename: event.filename, lineno: event.lineno, colno: event.colno });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      sendLog('error', [event.reason], { type: 'unhandledrejection' });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppTheme.background,
  },
});
