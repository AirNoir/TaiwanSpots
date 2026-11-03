import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ensureSession } from './auth';
import { supabase } from './supabase';

/**
 * Problem reports and suggestions (app/feedback.tsx → public.feedback, read in the admin
 * site). The table takes inserts only; nobody, the sender included, can read reports back.
 */

export type FeedbackKind = 'problem' | 'spot' | 'idea';

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  contactEmail: string | null;
  spotId: string | null;
  locale: string;
  hasFull: boolean;
  collected: number;
}

/** Why a report didn't go: offline/no cloud, one of the server's rate limits, or anything else. */
export type FeedbackResult = 'sent' | 'offline' | 'rate' | 'duplicate' | 'failed';

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function sendFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  if (!supabase) return 'offline';
  const session = await ensureSession();
  if (!session) return 'offline';
  const { error } = await supabase.from('feedback').insert({
    user_id: session.user.id,
    kind: input.kind,
    message: input.message.trim(),
    contact_email: input.contactEmail?.trim() || null,
    spot_id: input.spotId,
    app_version: Constants.expoConfig?.version ?? null,
    os_version: `${Platform.OS} ${Platform.Version}`,
    device: Platform.OS === 'ios' ? (Platform.isPad ? 'iPad' : 'iPhone') : Platform.OS,
    locale: input.locale,
    has_full: input.hasFull,
    collected: input.collected,
  });
  if (!error) return 'sent';
  // messages raised by the feedback_rate_limit trigger (supabase/migrations/20261103000000_feedback.sql)
  if (error.message.includes('feedback_duplicate')) return 'duplicate';
  if (error.message.includes('feedback_rate')) return 'rate';
  console.warn('[feedback] insert failed', error.message);
  return 'failed';
}
