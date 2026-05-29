import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLockScreen } from '@/src/components/app-lock-screen';
import { AuthProvider, useAuth } from '@/src/providers/auth-provider';
import { LanguageProvider } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

const queryClient = new QueryClient();

function RootNavigator() {
  const { locked } = useAuth();

  if (locked) {
    return <AppLockScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.canvas,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="pin-setup" />
      <Stack.Screen name="biometric-setup" />
      <Stack.Screen name="home" />
      <Stack.Screen name="my-games" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="ranking" />
      <Stack.Screen name="news" />
      <Stack.Screen name="members" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="tests" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
