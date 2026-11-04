# Android 上架準備（2026-11-04 起）

package `com.airnoir.islandia`（app.json 已設）。程式大多已考慮 Android（Apple 登入只在 iOS 顯示、導航改用 Google 地圖網址、Widget 同步只跑 iOS），以下是還缺的東西。標「你」的要在網頁後台操作，標「我」的是程式或設定，可以代做。

## 0. 先決定：Play 開發者帳號類型（你）

- **個人帳號**（2023-11 之後註冊）：正式上架前必須先跑「封閉測試」，**至少 12 人連續 14 天**加入測試，之後才能申請正式版。時程至少多 2～3 週。
- **機構帳號**：沒有這條限制，但要 D-U-N-S 編號（免費申請，約 1～2 週）。
- 註冊費 US$25，一次性。

## 1. 會擋住 App 運作的（必做）

| # | 項目 | 誰 | 說明 |
|---|---|---|---|
| 1 | Google 地圖 API key | 你＋我 | 主畫面地圖 `src/components/RealMap.tsx` 用 react-native-maps，Android 一定要 key，不然地圖空白或閃退。你：在 GCP 專案「微縮台灣」(945989250610) 啟用 **Maps SDK for Android**，建 API key，限制為 Android app（package＋SHA-1）。我：加 `react-native-maps` plugin 的 `androidGoogleMapsApiKey`（改 app.config.js 從 EAS env 讀）；`mutedStandard` 在 Android 無效，改用 `customMapStyle` 做淡色地圖。 |
| 2 | Google 登入 Android client | 你 | GCP 同專案建「Android」OAuth client：package `com.airnoir.islandia`＋SHA-1。SHA-1 要加兩組：EAS keystore（expo.dev → Credentials）和 Play App Signing（第一次上傳後在 Play Console → 應用程式完整性）。程式已用 web client id，不用改。 |
| 3 | RevenueCat Android | 你＋我 | Play Console 建一次性商品 `com.airnoir.islandia.full`（NT$190）；RevenueCat 加 Play Store App、上傳 Google 服務帳戶 JSON、商品掛到 entitlement `full`；Android public key（`goog_` 開頭）設成 EAS env `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`（我可以代設）。 |
| 4 | 相簿權限（Play 政策） | 我 | Google Play 只允許「核心功能」使用 `READ_MEDIA_IMAGES`，一般 App 要改用系統照片挑選器，否則要填聲明且常被拒。「收藏當天的照片」清單（`src/photos.ts` photosOfDay）在 Android 改成直接開系統照片挑選器（expo-image-picker，不需權限），並移除 READ_MEDIA_* 權限；存分享卡到相簿在 Android 10+ 不需讀取權限。 |

## 2. 送審資料（你，我可以先備好文字和圖）

- 商店資訊：簡短說明（80 字）、完整說明（4000 字）—從 store.config.json 改寫。
- 圖：App 圖示 512×512、**主題圖片 1024×500**（必備）、手機截圖 2～8 張（建議 1080×1920 以上）、7 吋／10 吋平板截圖（選填）。截圖要用 Android 畫面，不能沿用 iPhone 外框的圖—在 Android 模擬器拍。
- 資料安全性表單：對應 App Store 隱私權（電子郵件、使用者 ID、購買記錄、客服內容、其他使用者內容、診斷；全部「與帳號連結」「不分享給第三方」「傳輸加密」「可要求刪除」）。
- 內容分級問卷（IARC）、目標年齡層（13 歲以上）、廣告：無。
- 應用程式存取權：說明試玩模式怎麼用（同 App Review 備註）。
- 帳號刪除網址：Play 要求網頁版刪除說明—官網加 `/delete-account` 頁。
- 隱私權政策：https://islandia.littlestep.me/privacy（目前寫「適用於 iOS App」，要改成 iOS／Android）。

## 3. 打包與上傳（我，等你說可以再 build）

- eas.json 加 `submit.production.android`（`serviceAccountKeyPath`、`track: internal`）。
- `eas build -p android --profile production` → AAB；第一次要**手動**上傳到 Play Console，之後才能用 `eas submit`。
- 內部測試 → 封閉測試（個人帳號 14 天）→ 正式版。

## 4. 之後再做

- Android 主畫面小工具（expo-widgets 目前只有 iOS）。
- 官網加 Google Play 徽章。
