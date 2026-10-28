import type { AuthError, Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { AppState, Platform } from 'react-native';
import { Account, useStore } from './store';
import { supabase } from './supabase';
import { syncNow } from './sync';

// Sign-in (docs/spec.md §5.1). Every install gets a guest (anonymous) account in
// the background at first launch. Binding to Apple or Google signs into that
// identity instead: the passport on the phone is merged with the account's
// cloud copy, and the guest account is deleted so nothing is left behind.
// Native sign-in only (Apple's own sheet, Google's own account picker): the
// identity tokens go straight to Supabase, no browser and no secrets to rotate.

// Google's native module is not in Expo Go; load it lazily so Expo Go still runs.
type GoogleModule = typeof import('@react-native-google-signin/google-signin');
const google: GoogleModule | null = (() => {
  try {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
})();

// Public OAuth client ids (they ship inside the app; the secret is the user's
// own account). iOS signs the id token for the iOS client; Android needs the
// Web client to get an id token at all. Supabase must list both as client ids.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const googleAvailable =
  !!google && !!(Platform.OS === 'android' ? GOOGLE_WEB_CLIENT_ID : GOOGLE_IOS_CLIENT_ID);

/** Apple sign-in is iOS only here: on Android it would need a browser flow nobody uses. */
export const appleAvailable = Platform.OS === 'ios';

let googleConfigured = false;
function configureGoogle() {
  if (!google || googleConfigured) return;
  google.GoogleSignin.configure(
    Platform.OS === 'android' ? { webClientId: GOOGLE_WEB_CLIENT_ID } : { iosClientId: GOOGLE_IOS_CLIENT_ID },
  );
  googleConfigured = true;
}

function toAccount(user: User | null | undefined): Account | null {
  if (!user) return null;
  const anonymous = !!user.is_anonymous;
  const provider = user.app_metadata?.provider;
  return {
    id: user.id,
    anonymous,
    provider: anonymous ? 'anonymous' : provider === 'apple' ? 'apple' : 'google',
    email: user.email ?? null,
  };
}

/** The current session, or a new guest account when there is none. Null when offline. */
export async function ensureSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: guest, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[auth] guest sign-in failed', error.message);
    return null;
  }
  return guest.session;
}

let started = false;

/** Call once at launch. Keeps the store's account in step with the session and refreshes tokens in the foreground. */
export function startAuth() {
  if (!supabase || started) return;
  started = true;
  const client = supabase;
  client.auth.onAuthStateChange((event, session) => {
    // keep this callback synchronous: awaiting the client here deadlocks its lock
    useStore.getState().setAccount(toAccount(session?.user));
    if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) setTimeout(() => void syncNow(), 0);
  });
  void ensureSession();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      client.auth.startAutoRefresh();
      void ensureSession();
    } else {
      client.auth.stopAutoRefresh();
    }
  });
}

export type SignInResult = 'done' | 'cancelled' | 'failed';

type IdTokenSignIn = () => Promise<{ data: { session: Session | null }; error: AuthError | null }>;

/** Signs into a permanent account, merges the passport into it and drops the guest account it replaces. */
async function switchAccount(signIn: IdTokenSignIn): Promise<SignInResult> {
  if (!supabase) return 'failed';
  const before = (await supabase.auth.getSession()).data.session;
  const { data, error } = await signIn();
  if (error || !data.session) {
    console.warn('[auth] sign-in failed', error?.message);
    return 'failed';
  }
  await syncNow();
  if (before?.user.is_anonymous && before.user.id !== data.session.user.id) void dropGuest(before.access_token);
  return 'done';
}

async function dropGuest(accessToken: string) {
  if (!supabase) return;
  // the guest's rows were merged into the new account by the sync above
  const { error } = await supabase.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) console.warn('[auth] guest cleanup failed', error.message);
}

export async function signInWithApple(): Promise<SignInResult> {
  if (!supabase || !appleAvailable) return 'failed';
  const client = supabase;
  try {
    if (!(await AppleAuthentication.isAvailableAsync())) return 'failed';
    // Apple gets the hash and puts it in the token; Supabase gets the raw value and checks the hash.
    const nonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    const token = credential.identityToken;
    if (!token) return 'failed';
    return await switchAccount(() => client.auth.signInWithIdToken({ provider: 'apple', token, nonce }));
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    console.warn('[auth] apple failed', e);
    return 'failed';
  }
}

export async function signInWithGoogle(): Promise<SignInResult> {
  if (!supabase || !google || !googleAvailable) return 'failed';
  const client = supabase;
  try {
    configureGoogle();
    await google.GoogleSignin.hasPlayServices();
    const response = await google.GoogleSignin.signIn();
    if (response.type !== 'success') return 'cancelled';
    const token = response.data.idToken;
    if (!token) return 'failed';
    return await switchAccount(() => client.auth.signInWithIdToken({ provider: 'google', token }));
  } catch (e: any) {
    if (e?.code === google.statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
    console.warn('[auth] google failed', e);
    return 'failed';
  }
}

async function forgetGoogle() {
  // otherwise the next Google sign-in silently reuses the last account
  try {
    await google?.GoogleSignin.signOut();
  } catch {
    // never signed in with Google on this phone
  }
}

/** Leaves the account; the passport stays on the phone and a new guest account takes over. */
export async function signOut(): Promise<boolean> {
  if (!supabase) return false;
  await forgetGoogle();
  // local only: a global sign-out waits on the network and can hang the UI
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    console.warn('[auth] sign-out failed', error.message);
    return false;
  }
  useStore.getState().setLastSyncAt(null);
  await ensureSession();
  return true;
}

// Development only: lets automation drive sign-out, deletion and a sync from the
// Metro inspector, e.g. __islandiaAuth.syncNow().
if (__DEV__) (globalThis as any).__islandiaAuth = { ensureSession, signOut, deleteAccount, syncNow };

/** Deletes the cloud copy and the account itself (App Store 5.1.1(v)). The passport stays on the phone. */
export async function deleteAccount(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) {
    console.warn('[auth] delete failed', error.message);
    return false;
  }
  await forgetGoogle();
  await supabase.auth.signOut({ scope: 'local' });
  useStore.getState().setLastSyncAt(null);
  await ensureSession();
  return true;
}
