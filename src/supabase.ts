import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// The cloud behind sign-in and passport backup (docs/spec.md §5). Project URL and
// publishable key come from the EAS environment (and .env.local for Expo Go);
// a build without them has no cloud: nothing signs in and nothing syncs.

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const cloudAvailable = !!URL && !!KEY;

export const supabase = cloudAvailable
  ? createClient(URL!, KEY!, {
      auth: {
        // React Native has no localStorage: without this the session is lost on
        // every restart and each launch would become a new guest account.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
