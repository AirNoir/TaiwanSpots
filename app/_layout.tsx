import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { startPurchases } from '../src/purchases';
import { useTheme } from '../src/theme';

// Development only: lets a debugger or automation navigate, e.g. __islandiaRouter.push('/passport').
if (__DEV__) (globalThis as any).__islandiaRouter = router;

export default function RootLayout() {
  const t = useTheme();

  // Keep native UI (alerts, keyboard, share sheet) in step with the in-app theme.
  useEffect(() => {
    Appearance.setColorScheme(t.mode);
  }, [t.mode]);

  // Entitlements refresh at launch and on every return to the foreground (spec §4).
  useEffect(() => {
    startPurchases();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="spot/[id]"
          options={{ presentation: 'modal', contentStyle: { backgroundColor: t.bgElevated } }}
        />
        <Stack.Screen name="unseal" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', contentStyle: { backgroundColor: t.bgElevated } }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
