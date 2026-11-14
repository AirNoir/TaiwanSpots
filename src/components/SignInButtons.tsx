import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { appleAvailable, googleAvailable, SignInResult, signInWithApple, signInWithGoogle } from '../auth';
import { useT } from '../i18n';
import { makeStyles, Palette, useTheme } from '../theme';

/**
 * Apple (iOS only, spec §5.1) and Google sign-in buttons, shared by onboarding and the Me tab.
 * Signing in merges the passport on the phone with the account's backup (src/auth.ts).
 */
export function SignInButtons({ onDone }: { onDone?: () => void }) {
  const t = useTheme();
  const tr = useT();
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  useEffect(() => {
    if (appleAvailable) AppleAuthentication.isAvailableAsync().then(setAppleReady, () => setAppleReady(false));
  }, []);

  const run = async (signIn: () => Promise<SignInResult>) => {
    if (busy) return;
    setBusy(true);
    const result = await signIn();
    setBusy(false);
    if (result === 'failed') Alert.alert(tr('auth.failed'));
    if (result === 'done') onDone?.();
  };

  return (
    <View>
      {appleReady && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            t.mode === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={22}
          style={styles.appleBtn}
          onPress={() => void run(signInWithApple)}
        />
      )}
      {googleAvailable && (
        <Pressable style={styles.googleBtn} onPress={() => void run(signInWithGoogle)} disabled={busy} accessibilityRole="button">
          <MaterialCommunityIcons name={'google' as any} size={18} color={t.text} />
          <Text style={styles.googleText}>{tr('auth.google')}</Text>
        </Pressable>
      )}
      {busy && <ActivityIndicator color={t.accent} style={{ marginTop: 12 }} />}
    </View>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    appleBtn: { height: 44, marginTop: 14 },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: t.cardBorder,
      backgroundColor: t.bgElevated,
      marginTop: 10,
    },
    googleText: { color: t.text, fontSize: 15, fontWeight: '600' },
  }),
);
