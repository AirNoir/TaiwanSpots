import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import { useStore } from './store';
import { supabase } from './supabase';

/**
 * "I'm here, on this device": one call per account per Taiwan day, at launch and on
 * returning to the foreground (src/auth.ts). It feeds the admin site's active days and
 * device columns (supabase/migrations/20261108000100_admin_activity.sql, mark_active()).
 */

const taipeiDay = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);

let reported: string | null = null;

export function markActive(userId: string) {
  if (!supabase) return;
  const key = `${userId}:${taipeiDay()}`;
  if (reported === key) return;
  reported = key;
  const version = Application.nativeApplicationVersion;
  const build = Application.nativeBuildVersion;
  const state = useStore.getState();
  void supabase
    .rpc('mark_active', {
      p_platform: Platform.OS,
      p_device_model: Device.modelName ?? null,
      p_os_version: Device.osVersion ?? String(Platform.Version),
      p_app_version: version ? (build ? `${version} (${build})` : version) : null,
      p_locale: getLocales()[0]?.languageTag ?? null,
      p_is_dev: __DEV__ || !Device.isDevice,
      // the store's own answer, not hasFull(): no demo override, and importing entitlements here is a require cycle
      p_has_full: state.entitlements.includes('full'),
      p_collected: Object.keys(state.collections).length,
    })
    .then(({ error }) => {
      if (!error) return;
      reported = null; // try again on the next foreground
      console.warn('[activity] mark_active failed', error.message);
    });
}
