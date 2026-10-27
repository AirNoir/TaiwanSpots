import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';
import Purchases, { CustomerInfo, PRODUCT_CATEGORY, PurchasesStoreProduct } from 'react-native-purchases';
import { useStore } from './store';

// One-time purchases through RevenueCat (docs/spec.md §2, §4). The public SDK key
// comes from the EAS environment (EXPO_PUBLIC_REVENUECAT_IOS_KEY). Without a key,
// and always in Expo Go (where the SDK only runs a preview mock), buying is
// unavailable and demo builds use the simulated purchase switch instead.

export const PRODUCT_FULL = 'com.airnoir.islandia.full';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

export const purchasesAvailable =
  !!API_KEY && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let started = false;

function apply(info: CustomerInfo) {
  useStore.getState().setEntitlements(Object.keys(info.entitlements.active).sort());
}

/** Fetch the latest entitlements; offline the last known ones stay in the store. */
export async function refreshEntitlements() {
  if (!started) return;
  try {
    apply(await Purchases.getCustomerInfo());
  } catch (e) {
    console.warn('[purchases] refresh failed', e);
  }
}

/** Call once at launch. Refreshes again whenever the app comes back to the foreground. */
export function startPurchases() {
  if (!purchasesAvailable || started) return;
  try {
    Purchases.configure({ apiKey: API_KEY! });
  } catch (e) {
    console.warn('[purchases] configure failed', e);
    return;
  }
  started = true;
  Purchases.addCustomerInfoUpdateListener(apply);
  void refreshEntitlements();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') void refreshEntitlements();
  });
}

/** The full-version product with its StoreKit price; null when the store can't be reached. */
export async function loadFullProduct(): Promise<PurchasesStoreProduct | null> {
  if (!started) return null;
  try {
    const [product] = await Purchases.getProducts([PRODUCT_FULL], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    return product ?? null;
  } catch (e) {
    console.warn('[purchases] products failed', e);
    return null;
  }
}

export type BuyResult = 'bought' | 'cancelled' | 'failed';

export async function buy(product: PurchasesStoreProduct): Promise<BuyResult> {
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(product);
    apply(customerInfo);
    return 'bought';
  } catch (e: any) {
    if (e?.userCancelled) return 'cancelled';
    console.warn('[purchases] purchase failed', e);
    return 'failed';
  }
}

export type RestoreResult = 'restored' | 'nothing' | 'failed';

export async function restore(): Promise<RestoreResult> {
  if (!started) return 'failed';
  try {
    const info = await Purchases.restorePurchases();
    apply(info);
    return Object.keys(info.entitlements.active).length ? 'restored' : 'nothing';
  } catch (e) {
    console.warn('[purchases] restore failed', e);
    return 'failed';
  }
}
