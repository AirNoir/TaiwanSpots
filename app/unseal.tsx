import { useRouter } from 'expo-router';
import React from 'react';
import { UnsealOverlay } from '../src/components/UnsealOverlay';

/** Full-screen "all open" moment after a purchase or restore (spec §3.2). */
export default function UnsealScreen() {
  const router = useRouter();
  return <UnsealOverlay onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
