import { supabase } from './supabase';

/**
 * Product events for the admin site (public.app_events, insert-only). Fire and forget:
 * no session, no event. Props stay small and flat, and never carry location or photos.
 */

export type AppEventName =
  | 'onboarding_done'
  | 'checkin'
  | 'paywall_viewed'
  | 'purchase'
  | 'restore'
  | 'share_card'
  | 'photo_added'
  | 'directions_opened';

type Props = Record<string, string | number | boolean | null>;

export function logEvent(name: AppEventName, props: Props = {}) {
  if (!supabase) return;
  const client = supabase;
  void (async () => {
    const { data } = await client.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const { error } = await client.from('app_events').insert({ user_id: userId, name, props });
    if (error) console.warn('[analytics]', name, error.message);
  })();
}
