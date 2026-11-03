import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spotById } from '../src/data/spots';
import { useHasFull } from '../src/entitlements';
import { FeedbackKind, FeedbackResult, looksLikeEmail, sendFeedback } from '../src/feedback';
import { I18nKey, useLang, useT } from '../src/i18n';
import { COLUMN_MAX, useLayout } from '../src/layout';
import { useActiveCollections } from '../src/store';
import { makeStyles, Palette, useTheme } from '../src/theme';

// Report a problem or suggest something (Me tab, and a spot page for that spot).
// Goes to public.feedback and the admin site; never to a public issue tracker.

const KINDS: { kind: FeedbackKind; label: I18nKey; icon: string }[] = [
  { kind: 'problem', label: 'feedback.kind.problem', icon: 'bug-outline' },
  { kind: 'spot', label: 'feedback.kind.spot', icon: 'map-marker-outline' },
  { kind: 'idea', label: 'feedback.kind.idea', icon: 'lightbulb-outline' },
];

const ERRORS: Record<Exclude<FeedbackResult, 'sent'>, I18nKey> = {
  offline: 'feedback.error.offline',
  rate: 'feedback.error.rate',
  duplicate: 'feedback.error.duplicate',
  failed: 'feedback.error.failed',
};

export default function FeedbackScreen() {
  const t = useTheme();
  const styles = useStyles();
  const tr = useT();
  const lang = useLang();
  const router = useRouter();
  const layout = useLayout();
  const hasFull = useHasFull();
  const collected = Object.keys(useActiveCollections()).length;
  const params = useLocalSearchParams<{ spot?: string }>();
  const spot = params.spot ? spotById(params.spot) : undefined;

  const [kind, setKind] = useState<FeedbackKind>(spot ? 'spot' : 'problem');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<I18nKey | null>(null);
  const [sent, setSent] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const emailBad = email.trim() !== '' && !looksLikeEmail(email.trim());
  const canSend = message.trim().length > 0 && !emailBad && !busy;

  const onSend = async () => {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    const result = await sendFeedback({
      kind,
      message,
      contactEmail: email.trim() || null,
      spotId: spot?.id ?? null,
      locale: lang,
      hasFull,
      collected,
    });
    setBusy(false);
    if (result === 'sent') setSent(true);
    else setError(ERRORS[result]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('paywall.close')}>
          <Ionicons name="close" size={26} color={t.subtext} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: layout.gutter(COLUMN_MAX, 24) }]}
          keyboardShouldPersistTaps="handled"
        >
          {sent ? (
            <View style={styles.done}>
              <MaterialCommunityIcons name={'email-check-outline' as any} size={44} color={t.success} />
              <Text style={styles.title}>{tr('feedback.sent.title')}</Text>
              <Text style={styles.lead}>{tr(email.trim() ? 'feedback.sent.reply' : 'feedback.sent.body')}</Text>
              <Pressable style={styles.sendBtn} onPress={close} accessibilityRole="button">
                <Text style={styles.sendText}>{tr('feedback.sent.close')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{tr('feedback.title')}</Text>
              <Text style={styles.lead}>{tr('feedback.lead')}</Text>

              <View style={styles.kinds}>
                {KINDS.map((k) => {
                  const on = k.kind === kind;
                  return (
                    <Pressable
                      key={k.kind}
                      style={[styles.kind, on && styles.kindOn]}
                      onPress={() => setKind(k.kind)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <MaterialCommunityIcons name={k.icon as any} size={16} color={on ? t.onAccent : t.subtext} />
                      <Text style={[styles.kindText, on && styles.kindTextOn]}>{tr(k.label)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {spot && (
                <Text style={styles.spotNote}>
                  {tr('feedback.aboutSpot', { name: lang === 'zh' ? spot.name : (spot.nameEn ?? spot.name) })}
                </Text>
              )}

              <TextInput
                style={[styles.input, styles.message]}
                value={message}
                onChangeText={setMessage}
                placeholder={tr(`feedback.placeholder.${kind}` as I18nKey)}
                placeholderTextColor={t.faint}
                multiline
                maxLength={4000}
                textAlignVertical="top"
                autoFocus
              />

              <Text style={styles.label}>{tr('feedback.email')}</Text>
              <TextInput
                style={[styles.input, emailBad && { borderColor: t.danger }]}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={t.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                maxLength={320}
              />
              <Text style={styles.hint}>{tr('feedback.emailHint')}</Text>

              {error && <Text style={styles.error}>{tr(error)}</Text>}

              <Pressable
                style={[styles.sendBtn, !canSend && { opacity: 0.4 }]}
                onPress={() => void onSend()}
                disabled={!canSend}
                accessibilityRole="button"
              >
                {busy ? <ActivityIndicator color={t.onAccent} /> : <Text style={styles.sendText}>{tr('feedback.send')}</Text>}
              </Pressable>
              <Text style={styles.hint}>{tr('feedback.diagnostics')}</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bgElevated },
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
    container: { paddingBottom: 40 },
    title: { color: t.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
    lead: { color: t.subtext, fontSize: 14, lineHeight: 21, marginTop: 8 },
    kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
    kind: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    kindOn: { backgroundColor: t.accent, borderColor: t.accent },
    kindText: { color: t.subtext, fontSize: 14, fontWeight: '600' },
    kindTextOn: { color: t.onAccent },
    spotNote: { color: t.accent, fontSize: 13, fontWeight: '600', marginTop: 14 },
    input: {
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: t.text,
      fontSize: 15,
    },
    message: { minHeight: 150, marginTop: 16, lineHeight: 21 },
    label: { color: t.text, fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 8 },
    hint: { color: t.faint, fontSize: 12, lineHeight: 17, marginTop: 8 },
    error: { color: t.danger, fontSize: 13, marginTop: 16 },
    sendBtn: {
      backgroundColor: t.accent,
      borderRadius: 24,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      alignSelf: 'stretch',
    },
    sendText: { color: t.onAccent, fontSize: 16, fontWeight: '700' },
    done: { alignItems: 'center', paddingTop: 48 },
  }),
);
