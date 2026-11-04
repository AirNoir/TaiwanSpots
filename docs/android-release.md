# 微縮台灣 Islandia — Android／Google Play 上架交接文件

最後更新：2026-11-04。給接手的開發者或 AI agent，讀完這份就能開工。
iOS 0.1.0 已送 App Store 審查（Build 18）。Android 從零開始上架。

---

## 0. 給接手者的規則（必讀）

1. **不准自己跑 `eas build`**。EAS 用的是共用免費方案，每月 iOS、Android 各只有 15 次，要 build 前一定先問使用者。`eas credentials`（產生金鑰）不算 build，可以做。
2. **不能改壞 iOS**。iOS 正在審查，所有改動都要用 `Platform.OS === 'android'` 分支，或只動 Android 專用設定。改完在 iOS 模擬器確認行為不變。
3. **Expo SDK 57**（`expo ~57.0.28`），API 一直在變，不要憑記憶寫。先查 `https://docs.expo.dev/versions/v57.0.0/`；裝套件只能用 `npx expo install <pkg>`。
4. **`ios/`、`android/` 資料夾不存在**（CNG，原生專案在 build 時自動產生），不可手動建立或修改。原生設定只能改 `app.json` 或 config plugin。
5. 完成前必跑 `npx tsc --noEmit` 和 `npx expo lint`。
6. **祕密不進 repo**：Google 服務帳戶 JSON、`sk_` 開頭的 RevenueCat secret key 都不能 commit。公開的 key 放 EAS 環境變數（用 `eas env:create`／`eas env:update`），production、preview、development 三個環境都要設。
7. 帳號不能和「小步腳印 little-steps」混用：
   - Supabase 專案用 `islandia`（ref `cbpljsnzqsucgjiinztk`）。
   - Google Cloud 用專案「微縮台灣」（專案編號 945989250610），不是 little-steps 的 316691031472。
8. 對外動作（上傳商店、改後台、部署官網）要先跟使用者確認。
9. commit 訊息用英文，文件用繁體中文。

---

## 1. 專案基本資料

| 項目 | 值 |
|---|---|
| App 名稱 | 微縮台灣（英文 Islandia），開發者 AirNoir |
| Android package | `com.airnoir.islandia`（已設在 app.json） |
| 版本 | 0.1.0。`eas.json` 設 `appVersionSource: remote`，production 設 `autoIncrement: true`，versionCode 由 EAS 管理 |
| EAS 專案 | owner `airnoir`，slug `islandia`，projectId `f4241d2c-ef0d-49e1-8400-55cd1f72a9a9` |
| 路由 | Expo Router，畫面放在 `app/` |
| 後端 | Supabase（東京）：匿名帳號；`collections` 表（收藏備份）；`feedback` 表（回報，只能寫入） |
| 付費 | RevenueCat（`src/purchases.ts`）。商品 `com.airnoir.islandia.full`，entitlement `full`，iOS 定價 NT$190 |
| 登入 | Apple 登入只有 iOS。Google 登入用 `@react-native-google-signin/google-signin`（`src/auth.ts`），Android 走 Web client id，已寫好 |
| 官網 | https://islandia.littlestep.me（repo 在 `../taiwanspots-official-site`，Cloudflare Workers）。部署要 Node 22：`PATH=$HOME/.nvm/versions/node/v22.23.4/bin:$PATH npx wrangler@latest deploy` |
| 客服信箱 | support@littlestep.me |
| 商店文案來源 | `store.config.json`（iOS 用）。zh-Hant／en-US 各有 title、subtitle、description、keywords、promoText |
| 試玩模式說明 | `store.config.json` → `apple.review.notes`（iOS 審查備註） |

### 已經支援 Android 的部分（不用改）

- Apple 登入只在 iOS 顯示（`src/auth.ts` 的 `appleAvailable`）。
- 導航：Android 直接開 Google 地圖導航（`src/maps.ts`）；iPhone 有裝 Google 地圖時，會讓使用者選 Apple 或 Google。
- 小工具同步只在 iOS 執行（`src/widgets/sync.ts`）。Android 小工具這次不做。
- RevenueCat 程式已經讀 `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`（`src/purchases.ts:15`），只差還沒設值。
- 權限：app.json 的 `android.permissions` 只有定位（COARSE、FINE）。

### 地圖說明

主畫面的地圖只是淡色底圖，用來標出景點，不拿來查路，導航會交給外部的地圖 App。iOS 用 Apple 地圖當底圖，不需要 key。Android 只能用 Google 地圖，所以需要 API key（見 D）。iOS 底圖維持 Apple 地圖，這是使用者確認過的決定：換成 Google 要加 iOS SDK、要 key、App 會變大、要重新送審，好處卻幾乎看不出來。

---

## 2. 工作清單

標記：🧑 使用者在網頁後台操作　🤖 開發者／agent 可以做　⏳ 要等前一步完成

### A. 帳號與時程（🧑，最先做）

1. **註冊 Google Play 開發者帳號**：https://play.google.com/console/signup ，註冊費 US$25，一次付清。
   - **個人帳號**：正式上架前必須先跑「封閉測試」，**至少 12 位測試者連續 14 天**，之後才能申請正式版。要先找好 12 個 Google 帳號。
   - **機構帳號**：沒有這個限制，但要有 D-U-N-S 編號（免費申請，約 1～2 週）。
   - ⚠️ 規定以 Play Console 註冊當下顯示的為準。
2. Play Console →「建立應用程式」：
   - 名稱：「微縮台灣」
   - 預設語言：「中文（繁體）– zh-TW」
   - 類型：「應用程式」
   - 免費或付費：選「免費」（有內購也選免費）
3. Play Console →「設定」→「付款資料」：建立付款資料（收款帳戶、稅務）。沒建的話不能新增付費商品。

### B. 簽署金鑰與 SHA-1（🤖＋🧑）

Google 登入和地圖 key 都要登記 SHA-1 憑證指紋，總共兩組：

| 哪一組 | 怎麼拿 | 什麼時候有 |
|---|---|---|
| ① EAS 上傳金鑰 | 🤖 執行 `npx eas-cli@latest credentials -p android` → 選 production → 產生 Keystore。這是互動式指令，可以用 `scripts/ptyrun.py` 包 pty 執行。完成後 SHA-1 會出現在輸出裡，也可以在 expo.dev → 專案 → Credentials → Android 查看 | 現在就能做，不需要 build |
| ② Play 應用程式簽署金鑰 | 🧑 Play Console → App →「測試與發布」→「應用程式完整性」→「Play 應用程式簽署」→「應用程式簽署金鑰憑證」裡的 SHA-1 | ⏳ 第一次上傳 AAB 之後 |

從 Play 商店下載的版本用②簽署，自己安裝的測試版用①簽署。兩組都要登記，否則商店版會登入失敗、地圖空白。

### C. Google 登入：新增 Android OAuth client（🧑，每組 SHA-1 各做一次）

1. 打開 https://console.cloud.google.com/apis/credentials
2. 左上角的專案選「**微縮台灣**」。
3. 按「＋ 建立憑證」→「OAuth 用戶端 ID」。
4. 應用程式類型選 **Android**。
5. 名稱：第一組填 `微縮台灣 Android（EAS）`，第二組填 `微縮台灣 Android（Play）`。
6. 套件名稱：`com.airnoir.islandia`。
7. SHA-1 憑證指紋：貼上對應的那組。
8. 按「建立」。

建好的 Android client ID **不用**放進 App 或 Supabase。App 用的是 Web client id（`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`，已設好），Google 會用「package＋SHA-1」辨認是哪個 App。

### D. Google 地圖（🧑＋🤖）— 必做，否則 Android 主畫面地圖空白

🧑 申請 key：
1. 打開 https://console.cloud.google.com/apis/library ，專案選「微縮台灣」，啟用 **Maps SDK for Android**。
2. 到「憑證」→「＋ 建立憑證」→「API 金鑰」。
3. 編輯這把金鑰：
   - 應用程式限制：選「Android 應用程式」，加入 `com.airnoir.islandia`＋SHA-1 ①。② 之後再補。
   - API 限制：只勾「Maps SDK for Android」。
4. 把金鑰交給開發者。

🤖 程式部分（參考 https://docs.expo.dev/versions/v57.0.0/sdk/map-view/ ）：
1. key 放進 EAS 環境變數，例如 `GOOGLE_MAPS_ANDROID_KEY`，三個環境都設；本機放在 `.env.local`。
2. app.json 不能讀環境變數，所以新增 `app.config.js`（或 `.ts`）：讀入 app.json 的設定，再加上 plugin `["react-native-maps", { "androidGoogleMapsApiKey": process.env.GOOGLE_MAPS_ANDROID_KEY }]`。plugins 裡如果已經有 react-native-maps，要去掉重複的。也要確認 `.easignore` 沒有排除需要的檔案。
3. `src/components/RealMap.tsx`：
   - `mapType="mutedStandard"` 和 `userInterfaceStyle` 只有 iOS 有效。Android 改用 `customMapStyle`（Google 地圖樣式 JSON）：低飽和、隱藏 POI 和交通圖示，外觀接近 iOS 的淡色地圖。淺色、深色主題各做一份。
   - iOS 不要傳 `provider`，保持用 Apple 地圖。
4. 檢查 `onPress` 裡判斷 `marker-press` 的寫法在 Android 是否成立（註解描述的是 iOS 的行為）。點標記時不能把選取清掉。

驗收：
- Android 模擬器的主畫面地圖正常顯示，標記可以點，淺色、深色主題都正確。
- iOS 畫面沒有變化。

### E. 相簿權限改用系統照片挑選器（🤖）— Play 政策，必做

Google Play 規定：只有以相簿為核心功能的 App 才能申請 `READ_MEDIA_IMAGES`／`READ_MEDIA_VIDEO`，其他 App 要用 Android 系統的照片挑選器。否則審查時會被要求填聲明，而且通常會被拒。

現況：
- `src/photos.ts` 的 `photosOfDay()`、`photosNear()` 用 `expo-media-library` 搜尋整個相簿，列出收藏當天或景點附近拍的照片。
  - 呼叫端：`src/components/PhotoStrip.tsx:173-174`、`src/components/DayPhotoPicker.tsx`。
  - `presentLimitedPicker` 是 iOS「有限存取」專用。
- `saveToLibrary()` 用 `MediaLibrary.requestPermissionsAsync(true)` 加 `Asset.create` 存分享卡，呼叫端是 `src/components/ShareCardModal.tsx:108`。
- app.json 的 `expo-media-library` plugin 設了 `granularPermissions: ["photo"]`，Android 會因此加上 `READ_MEDIA_IMAGES`。

要做：
1. Android 上「加照片」只提供兩個選項：「拍照」，以及「從相簿挑選」（用 `pickPhotos()`，也就是 expo-image-picker；Android 13 以上走系統照片挑選器，不需要權限）。「當天照片」「附近照片」清單只在 iOS 顯示。
2. 存分享卡：Android 只用寫入。Android 10 以上寫入自己建立的圖片，不需要讀取權限。確認 `requestPermissionsAsync(true)` 在 Android 不會要求讀取權限；如果會，就改成不需要權限的寫法，或跳過權限檢查。
3. 確保最後產生的 AndroidManifest **沒有** `READ_MEDIA_IMAGES`、`READ_MEDIA_VIDEO`、`READ_EXTERNAL_STORAGE`：
   - 方法：調整 plugin 選項，或在 app.json 的 `android.blockedPermissions` 列出這三個權限。
   - 檢查方式：執行 `npx expo prebuild -p android --no-install`，查看產生的 manifest，看完刪掉 `android/`，不要 commit。
4. `src/i18n.ts` 的文案不能提到 Android 上沒有的選項。

驗收：
- Android 上能拍照加入、能從系統挑選器加入、能把分享卡存到相簿。
- manifest 沒有讀取相簿的權限。
- iOS 行為不變。

### F. RevenueCat＋Play 內購（🧑＋🤖）

🧑：
1. Play Console → App →「營利」→「產品」→「應用程式內產品」（一次性商品）→ 建立：
   - 產品 ID：`com.airnoir.islandia.full`
   - 名稱：「完整版」；說明參考 iOS 內購的說明
   - 價格：NT$190，啟用
   - ⏳ Play 要先上傳過一個含 Billing 的 AAB（任一測試軌都可以）才能建商品，所以這步排在 G 之後。
2. 在 Google Cloud（專案「微縮台灣」）建立服務帳戶，到 Play Console「使用者和權限」授予財務相關權限，下載 JSON 金鑰。詳細步驟照 RevenueCat 官方文件「Google Play Store service credentials」當下的版本操作。
3. RevenueCat 專案「微縮台灣」→ 新增 App → Play Store：
   - package 填 `com.airnoir.islandia`
   - 上傳服務帳戶 JSON
   - 匯入商品 `com.airnoir.islandia.full`，掛到 entitlement **`full`**（App 只認這個名字，見 `src/entitlements.ts`）
4. 複製 Android 的 public SDK key（`goog_` 開頭）交給開發者。

🤖：把 key 設成 EAS 環境變數 `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`，三個環境都設。

驗收（用內部測試版、測試帳號）：
- 看得到 NT$190，能購買，完整版內容會解鎖。
- 刪掉 App 重裝後，「恢復購買」能恢復。
- 先在 Play Console「授權測試」加入測試者的 Gmail，測試時才不會真的扣款。

### G. 第一次打包與上傳（🤖，⏳ 使用者同意 build 之後）

1. eas.json 加上：
   - `submit.production.android`：`{ "serviceAccountKeyPath": "<本機路徑，不進 repo>", "track": "internal" }`
   - `build.production.android` 要輸出 AAB（預設就是，確認即可）
2. 執行 `npx eas-cli@latest build -p android --profile production`。
3. **第一次必須手動上傳**：🧑 從 expo.dev 下載 AAB，到 Play Console →「測試」→「內部測試」→ 建立版本 → 上傳。之後的版本才能用 `eas submit -p android` 上傳。
4. 上傳後去拿 SHA-1 ②，補進 C 和 D 的設定。補 SHA-1 不用重新 build。

### H. 商店資訊與政策表單（🤖 準備內容，🧑 貼進 Play Console）

**主要商店資訊**（以 zh-TW 為主，另加 en-US）：
- 應用程式名稱（30 字內）：「微縮台灣」或「微縮台灣：走到哪收藏到哪」，參考 `store.config.json` 的 title、subtitle。
- 簡短說明（80 字內）：從 subtitle＋promoText 改寫。
- 完整說明（4000 字內）：從 description 改寫，拿掉 iOS 專屬字眼（iPhone、Widget、Apple 登入、鎖定畫面）。

**圖像**（放在 `store/play/`）：

| 項目 | 規格 | 怎麼做 |
|---|---|---|
| 應用程式圖示 | 512×512 PNG | 從 `assets/` 的 App icon 輸出 |
| 主題圖片（必備） | 1024×500，JPG 或 PNG，不可透明 | 改 `store/marketing/templates/hero2.html` 的版面，用 `render.mjs`（playwright-core，`channel:'chrome'`）輸出 |
| 手機螢幕截圖 | 2～8 張；16:9 或 9:16；邊長 320～3840；建議 1080×1920 | ⏳ 要等有 Android 版。在 Android 模擬器（Pixel）拍，套用 `store/marketing/templates/shot2.html` 的標題和底色，手機框改成 Android 樣式或不加框。**不可沿用 iPhone 外框的圖** |
| 平板截圖（選填） | 7 吋、10 吋 | 有提供，App 才會被推薦給平板使用者 |

**政策表單**（Play Console →「政策」→「應用程式內容」）：

| 表單 | 建議回答 |
|---|---|
| 隱私權政策 | https://islandia.littlestep.me/privacy 。🤖 先把頁面上「適用於 iOS App」改成 iOS 與 Android，並加上 Google Play 付款的說明 |
| 應用程式存取權 | 選「部分功能受限」，附上試玩模式說明（翻寫 `store.config.json` 的審查備註）：審查人員不需要帳號，點「開始體驗」→「模擬位置」就能收藏 |
| 廣告 | 不含廣告 |
| 內容分級（IARC 問卷） | 無暴力、色情、賭博；使用者之間能否互相溝通：**否**（回報只送給開發者）；是否分享使用者位置：**否**；是否有數位商品購買：**是** |
| 目標對象 | 13 歲以上（避免適用「家庭」政策） |
| 資料安全性 | 見下表 |
| 政府應用程式／新聞／健康 | 都選「否」 |
| 帳號刪除 | Play 要求提供網址。🤖 先確認 App 內有沒有刪除帳號的功能（查 `src/auth.ts`、`app/(tabs)/me.tsx`），再在官網新增 `/delete-account` 頁：說明在 App「我的」頁怎麼刪除帳號，以及也可以寄信到 support@littlestep.me 要求刪除 |

**資料安全性**（內容要和隱私權政策 `docs/privacy.md` 一致）：

| 資料類型 | 是否收集 | 是否分享給第三方 | 用途 | 選填或必要 |
|---|---|---|---|---|
| 個人資訊 › 電子郵件地址 | 是（Google 登入；回報時選填） | 否 | 應用程式功能、帳戶管理、開發人員通訊 | 選填 |
| 個人資訊 › 使用者 ID | 是（Supabase 帳號、RevenueCat ID） | 否 | 應用程式功能、帳戶管理 | 必要 |
| 財務資訊 › 購買記錄 | 是（RevenueCat） | 否 | 應用程式功能 | 必要 |
| 訊息 › 其他應用程式內訊息（回報內容） | 是 | 否 | 開發人員通訊 | 選填 |
| 應用程式活動 › 其他使用者產生的內容（收藏紀錄備份） | 是 | 否 | 應用程式功能 | 必要 |
| 應用程式資訊與效能 › 其他診斷資料（回報附帶的版本、系統、裝置） | 是 | 否 | 分析（除錯） | 選填 |
| 位置、相片、聯絡人、裝置 ID | **否**（位置只在手機上計算，照片不上傳） | — | — | — |

- 資料傳輸是否加密：是。
- 使用者能否要求刪除資料：是。
- RevenueCat、Supabase 是代你處理資料的「服務供應商」，不算「分享給第三方」。

### I. 測試與正式上線（🧑）

1. 內部測試：自己安裝，驗收 D、E、F 和 Google 登入。
2. 封閉測試（個人帳號必做）：12 人以上，連續 14 天，期間保持安裝。
3. 「正式版」→ 建立版本 → 送審。Google 審查通常需要幾小時到幾天。
4. 國家／地區：比照 iOS 全部開放，或只開台灣，由使用者決定。

---

## 3. 建議順序

1. **A 註冊帳號**。同時可以開始下面兩條線：
   - **金鑰線**：B① 產生 EAS 金鑰 → C（EAS 那組）＋ D 申請地圖 key。
   - **程式線（🤖，不需要任何 key，可以馬上開始）**：E 相簿改寫、D 地圖樣式、H 的文案和主題圖。
2. 兩條線都完成後 → **G 第一次 build，手動上傳到內部測試**。
3. G 之後：
   - 拿 B② → 補 C（Play 那組）和 D 的 SHA-1。
   - **F** 建內購、設定 RevenueCat。
4. **H 截圖** → **I 測試** → 正式上線。

## 4. 這次不做

- Android 主畫面小工具（expo-widgets 目前只支援 iOS）。
- 官網加 Google Play 徽章（上架後再加）。
- 天氣資料授權：目前用 Open-Meteo 免費 API（`src/atmosphere.ts`），免費版不可商業使用，iOS、Android 都受影響。建議改用中央氣象署開放資料，另案處理。
