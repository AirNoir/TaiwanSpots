/**
 * Demo helpers (teleport to a spot, preset locations, reset collection).
 * On in development; a TestFlight / internal build turns them on with
 * EXPO_PUBLIC_DEMO_TOOLS=1. Off in store builds, where they would let anyone
 * collect a spot without going there.
 */
export const DEMO_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEMO_TOOLS === '1';
