# 微縮台灣（Islandia）產品規格：買斷制、免費體驗、登入

版本 0.3（2026-10-27）。狀態：**第一階段程式已完成，等 RevenueCat 設定後上線**（見第 9 節）。
標「預設」的數值是建議值，改這份文件就算改規格。背景討論在 `docs/auth-and-pricing.md`。

---

## 1. 目標

- 讓人免費出門玩到上癮，在「收藏欲最強」的時候付一次錢，之後不再有任何付費牆（外島禮包除外）。
- 任何情況下都**不能讓使用者「人到了卻收不到」**。
- 登入是選配，只用來備份和同步；不登入也能完整使用、購買、恢復購買。

## 2. 商品與價格

| 商品 | Product ID | 類型 | 價格（預設） |
|---|---|---|---|
| 完整版 | `com.airnoir.islandia.full` | 非消耗性（non-consumable） | **NT$190**，上架首月早鳥 **NT$150** |
| 外島禮包 | `com.airnoir.islandia.outer_islands` | 非消耗性 | **NT$90** |

- 價格以 App Store Connect 的台灣價格點為準；其他地區用 Apple 自動換算（美國約 US$4.99 / 外島 US$2.99）。
- 早鳥價用 App Store Connect 的「排定價格」做，不另開商品。
- 外島禮包不需要先買完整版（各自獨立），但外島模型同樣適用第 3 節的封存規則：沒買完整版時，外島收藏也算進免費的 5 個名額。

### 定價理由

- 每個模型約 NT$1.5（190 ÷ 130），對收藏型使用者是很直覺的划算。
- 台灣付費 App 常見落在 NT$90–300，NT$190 在「想都不用想就買」和「有質感」之間。低於 NT$150 會讓 130 個手作模型顯得廉價；高於 NT$300 會讓還在試用的人猶豫。
- 實拿：台灣售價含 5% 營業稅，加入 App Store 小型開發者計畫抽 15%，NT$190 約實拿 NT$154。
- 外島 NT$90 約為完整版一半，對已經付過錢的人是衝動價。

## 3. 免費版與完整版

### 3.1 功能對照

| 功能 | 免費 | 完整版 |
|---|---|---|
| 地圖三層、所有景點名稱、未收藏數字與提示、「只看未收藏」 | ✅ | ✅ |
| 打卡、收藏動畫、護照印章與日期 | ✅ 不限次數 | ✅ |
| 微縮模型（圖、全螢幕檢視、分享卡） | 前 **5** 個（2026-10-27 由 10 改為 5：一天的城市散步就能走完 3 個，5 個讓人多出門一次再遇到封存） | 全部 |
| 成就 | ✅ 全部（進度用打卡次數計算） | ✅ |
| 導航、天氣、季節（目前只以文字呈現；模型與地圖上的晝夜、天氣遮罩已關閉，見 `ATMOSPHERE_OVERLAYS`） | ✅ | ✅ |
| 主畫面 Widget、動態島 | ✅（預設；它們會把人帶出門、帶到付費牆） | ✅ |

### 3.2 封存規則

- 「免費名額」= 依收藏順序（`CollectionEntry.order`）的**前 5 個**。已下架景點的收藏不佔名額。
- 第 6 個起的收藏照樣寫入 `collections`（日期、季節、天氣都記錄），狀態為**封存**。封存不存進資料，而是即時算出：`!entitled('full') && rank(order) > FREE_LIMIT`。
- 封存的景點在各處的呈現：
  - **收藏動畫**：照常播放，模型改成剪影＋「已收藏・購買完整版開箱」；
  - **護照**：顯示印章與日期，圖是剪影；
  - **景點頁**：照常顯示資訊與「已收藏」，模型處顯示剪影＋購買按鈕；
  - **地圖**：照常算「已收藏」（白框＋勾勾），縮圖是剪影；
  - **Widget**：只輪播已開箱的模型。
- 購買成功：所有封存**同時開箱**，播一次「全部開箱」動畫（依收藏順序快速翻牌），之後回到原畫面。
- 名額永遠不會被收回：已開箱的 5 個不會因為任何狀況變回封存。

### 3.3 付費牆出現的時機

只在下面三處出現，**不使用跳出式廣告視窗**：

1. 第 11 個收藏的動畫結尾（第一次遇到封存時），一次。
2. 點任何封存模型時。
3. 「我的」頁固定的「完整版」區塊（同時放「恢復購買」）。

付費頁內容：已封存的數量與縮圖剪影、「一次買斷，之後新增的本島景點都包含」、價格（從 StoreKit 讀，不寫死）、購買、恢復購買、隱私權與使用條款連結。

### 3.4 TestFlight 與既有使用者

- App 尚未上架，沒有既有付費使用者需要補償。
- `DEMO_TOOLS` 開啟時（開發、Expo Go、設了 `EXPO_PUBLIC_DEMO_TOOLS=1` 的版本），「我的」頁可以切換「模擬購買：真實／已購買／未購買」；正式版沒有這個開關。
- **沒有設定 RevenueCat key 的正式版本（例如現在的 TestFlight）一律不封存**，「我的」頁也不顯示完整版區塊：沒有東西可賣時，不能讓人卡在封存。key 一設好，封存規則就生效。
- Expo Go 裡 RevenueCat 只有預覽模式，視為不能購買；付款要用 EAS 打包的版本測試（沙盒帳號）。

## 4. 權益（entitlement）

- 付款用 RevenueCat（`react-native-purchases`）。RevenueCat 裡建一個 entitlement `full`、一個 `outer_islands`。
- App 啟動與回到前景時更新權益，結果存進 store：`entitlements: string[]`（persist），離線時沿用最後一次結果。
- 「恢復購買」呼叫 `restorePurchases()`；成功或失敗都要有明確提示。
- 權益和登入無關：沒登入也能買、能恢復。登入後，RevenueCat 的 App User ID 設成登入帳號 id，讓同一帳號跨裝置共用權益。

## 5. 登入（第二階段）

### 5.1 流程

1. 首次開啟：不顯示登入畫面，背景以 Supabase **匿名登入**建立帳號；失敗（離線）就純本機使用，之後再試。
2. 「我的」頁「備份我的收藏」：**使用 Apple 登入**、**使用 Google 登入**兩個按鈕，把匿名帳號綁定（`linkIdentity`）到該身分。
3. 新手機登入既有帳號：雲端紀錄與手機上的紀錄合併。
4. 「我的」頁「登出」與「刪除帳號」。刪除會清掉雲端資料，手機上的收藏保留。

### 5.2 同步規則

- 雲端表 `collections`：`user_id`、`spot_id`、`checked_in_at`（ISO 8601 UTC）、`season`、`sky`、`night`、`variant`；主鍵 `(user_id, spot_id)`，RLS 只允許本人讀寫。
- 合併規則：同一景點保留**最早**的打卡紀錄；`order` 依合併後的 `checked_in_at` 重新排序。
- 免費名額依合併後的順序計算，所以換手機不會改變哪 5 個已開箱（最早的 5 個）。

### 5.3 套件與設定

- `@supabase/supabase-js`、`react-native-url-polyfill`、`@react-native-google-signin/google-signin`、`expo-apple-authentication`、`expo-crypto`；全部透過 `npx expo install` 安裝（已裝，2026-10-28）。
- 需要 development build，不能再用 Expo Go 測試；本機 Xcode 版本不足，development build 走 EAS 雲端。
- 需要準備：Google Cloud iOS OAuth Client ID、Supabase 專案（URL 與 anon key 放 EAS 環境變數，不進 repo）、Apple Developer 後台開啟 Sign in with Apple。

### 5.4 後台專案（Supabase 額度）

- Supabase 免費版只能有 **2 個啟用中的專案**，目前已滿（含 little-steps）。暫停的專案不佔額度、不收費。
- **Islandia 不和 little-steps 共用專案**：
  - little-steps 的 `cleanup-anonymous` 會刪掉 30 天沒綁定的訪客帳號，Islandia 的訪客會被一起刪掉；
  - `delete-account` 會連帶刪掉另一個 App 的帳號；
  - 兩邊的使用者會混在同一份名單和統計裡，而 little-steps 有兒童資料。
- 第一階段（買斷）不需要後台，所以現在不用處理。到第二階段時從下面擇一：
  1. 另一個專案沒在用 → 暫停它，Islandia 開新的免費專案。
  2. little-steps 已有付費用戶 → 組織升級 Pro（US$25／月，含 US$10 運算額度），Islandia 再加一個專案（約 +US$10／月），合計約 US$35／月。Pro 也讓 little-steps 有每日備份、不會因閒置被暫停。
  3. 改用 Firebase（免費方案即有匿名、Google、Apple 登入），代價是和 little-steps 維護兩套技術。
- little-steps 的 `contexts/AuthContext.tsx`（Google／Apple `signInWithIdToken`、匿名登入）可以直接參考移植。
- 匿名帳號的清理：edge function `cleanup-anonymous`（dry_run 預設，`x-cron-secret` 保護），pg_cron 每天 03:30（台灣）呼叫一次刪 30 天沒用的匿名帳號；secret 在 Vault（`cleanup_cron_secret`）與 function secrets（`CLEANUP_CRON_SECRET`），本機鑰匙圈 `supabase-islandia-cleanup-secret` 有一份。
- **已決定並建立（2026-10-27）**：組織已升級 Pro，新專案 `islandia`（ref `cbpljsnzqsucgjiinztk`，東京 ap-northeast-1）。資料庫密碼存在 macOS 鑰匙圈（服務名稱 `supabase-islandia-db`，`security find-generic-password -s supabase-islandia-db -w` 取得），不進 repo。URL 與 anon key 到第二階段再放進 EAS 環境變數。

### 5.6 實作紀錄（2026-10-28）

| 項目 | 位置 |
|---|---|
| Supabase client（URL／publishable key 來自 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_KEY`；沒有就整段關閉） | `src/supabase.ts` |
| 登入：啟動時匿名、Apple 原生、Google 原生、登出、刪除帳號 | `src/auth.ts` |
| 同步：拉、合併（同景點取最早、依日期重排 `order`）、推；啟動／登入／收藏後 1.5 秒／回前景超過 5 分鐘 | `src/sync.ts` |
| 「我的」頁「備份」卡：未綁定顯示 Apple（只有 iOS）與 Google 按鈕；已綁定顯示帳號、最近同步、登出、刪除帳號 | `app/(tabs)/me.tsx` |
| 資料表 `collections` 與 RLS | `supabase/migrations/20261028000000_collections.sql` |
| `delete-account`（刪自己；綁定後也用它刪掉舊的匿名帳號）、`cleanup-anonymous` | `supabase/functions/*` |
| 清理排程（pg_cron + pg_net，secret 在 Vault） | `supabase/migrations/20261028000100_cleanup_schedule.sql` |

和原本 5.1 的差異：

- **綁定不是 `linkIdentity`**。Supabase 的 `linkIdentity` 只走瀏覽器 OAuth，原生拿到的 Apple／Google id token 不能掛到匿名帳號上。所以綁定 = 用 id token 登入另一個（永久）帳號 → 把手機上的收藏和那個帳號的雲端紀錄合併 → 用舊的匿名 session 呼叫 `delete-account` 把匿名帳號刪掉。手機上的收藏永遠是完整的，所以不會掉資料。
- **Apple 走原生**（`expo-apple-authentication` + `signInWithIdToken`），不是小步腳印的網頁 OAuth：不用 Services ID、不用每 6 個月換一次 secret，Supabase 只要在 Apple provider 的 Client IDs 填 bundle id `com.airnoir.islandia`（已用 Management API 設好）。有帶 nonce（SHA-256 給 Apple、原文給 Supabase）。
- **Android 不顯示 Apple 登入**（`appleAvailable = Platform.OS === 'ios'`），和小步腳印 2026-09-24 的決定一致。`android.package` 已設為 `com.airnoir.islandia`。
- 登出用 `scope: 'local'`（不等網路），登出後自動再建一個匿名帳號，收藏留在手機上。
- Expo Go 沒有 Google 原生模組：`src/auth.ts` 用 try/require 載入，載不到就不顯示 Google 按鈕。
- Supabase 後台設定（匿名登入、Apple provider）是用 Management API `PATCH /v1/projects/{ref}/config/auth` 設的，token 在 `~/.supabase/access-token`；Google provider 等 OAuth client 建好再設（`external_google_enabled`、`external_google_client_id` 填 iOS 與 Web 兩個 id 以逗號分隔、`external_google_skip_nonce_check: true`）。
- 用的是新的 publishable key（`sb_publishable_…`），不是舊的 anon JWT（Supabase 2026 年底淘汰）。

還沒做：

1. Google Cloud 的 OAuth client（iOS：bundle id `com.airnoir.islandia`；Web：給 Android 用）。拿到後：`app.json` plugins 加 `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<iOS client id 前段>" }]`、EAS 環境變數 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`／`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`、Supabase Google provider。
2. 真機驗收（Apple／Google 登入在模擬器和 Expo Go 無法測）：第 6 節第二階段清單。
3. App Store 隱私標籤加「電子郵件」「使用者 ID」「其他使用者內容（收藏紀錄）」，用途 App 功能，不用於追蹤。

### 5.5 審核與隱私

- 有 Google 登入就必須有 Apple 登入（準則 4.8）。
- App 內可刪除帳號（準則 5.1.1(v)）。
- 更新 `docs/privacy.md` 與 App Store 隱私標籤：新增「電子郵件（登入用）」與「收藏紀錄（同步用）」，用途為 App 功能，不用於追蹤。位置資料仍然不上傳。

## 6. 驗收條件

**第一階段：買斷**
- [ ] 全新安裝收藏 5 個，全部開箱；第 6 個收藏成功，並在動畫結尾出現付費提示一次。
- [ ] 封存模型在動畫、護照、景點頁、地圖、Widget 都不會露出原圖。
- [ ] 沙盒帳號購買後，所有封存立即開箱，重開 App 仍為開箱。
- [ ] 刪除 App 重裝，按「恢復購買」能拿回權益。
- [ ] 飛航模式下，已購買的使用者仍是完整版。
- [ ] 價格顯示來自 StoreKit（切換商店地區時幣別正確）。

**第二階段：登入**
- [ ] 不登入可以完整使用與購買。
- [ ] 匿名使用一陣子後綁定 Google，收藏不遺失；在第二台裝置登入，收藏出現。
- [ ] 兩台裝置收藏不同景點，合併後兩邊一致，最早的 5 個為開箱。
- [ ] 刪除帳號後雲端資料清除，手機上的收藏保留。
- [ ] Apple 登入與 Google 登入都可用。

## 7. 時程

1. **第一階段**：RevenueCat 與 ASC 商品設定、權益 store、封存呈現、付費頁、恢復購買、全部開箱動畫。
2. **第二階段**：Supabase 匿名登入、Apple／Google 綁定、同步、刪除帳號、隱私更新。
3. **第三階段**：外島禮包（見 `docs/dlc-outer-islands.md`）。

## 8. 仍待決定

- ~~正式 App 名稱~~：中文「微縮台灣」，副標題「走到景點，收藏一座小島」；英文維持 Islandia: Collect Taiwan（2026-10-27 已更新 ASC 與 App 顯示名稱）。
- 是否加入 App Store 小型開發者計畫（影響抽成 15% 或 30%；建議加入）。
- ~~第二階段的後台~~：已決定用 Supabase Pro 開新專案（見 5.4）。
- 早鳥價 NT$150：上架日確定後，在 ASC 用「排定價格」設定首月價格。
- 外島禮包商品：第三階段有內容時再建立（商品 ID 刪除後不能重用，先不佔）。

## 9. 進度與下一步

### 第一階段已完成（2026-10-27）

| 項目 | 位置 |
|---|---|
| 權益與封存規則（前 5 個免費、即時計算） | `src/entitlements.ts` |
| RevenueCat 包裝（啟動、回前景更新、價格、購買、恢復） | `src/purchases.ts` |
| 剪影：每個模型一張去背遮罩，App 內上色 | `scripts/make-silhouettes.py`（`npm run assets:silhouettes`）→ `collection/silhouette.webp` |
| 封存呈現：收藏動畫、護照、景點頁、探索、首頁、兩種地圖、Widget | `Diorama` 的 `sealed`、`PinArt`、`widgets/sync.ts` |
| 付費頁（數量、剪影、StoreKit 價格、購買、恢復、隱私與條款） | `app/paywall.tsx` |
| 全部開箱動畫（依收藏順序翻牌） | `app/unseal.tsx`、`src/components/UnsealOverlay.tsx` |
| 「我的」頁完整版區塊、恢復購買、模擬購買開關 | `app/(tabs)/me.tsx` |
| ASC 商品 `com.airnoir.islandia.full`（ASC id 6827454434）：NT$190、全部地區、中英文說明、審核截圖，狀態 READY_TO_SUBMIT | App Store Connect |

新的模型圖加入後要跑 `npm run assets:silhouettes` 再跑 `npm run assets:registry`，否則封存時會退回鎖頭圖示（不會露出原圖）。

### RevenueCat 與 TestFlight（2026-10-27）

- RevenueCat 專案「微縮台灣」：iOS App `com.airnoir.islandia`、In-App Purchase Key、App Store Connect API key、商品 `com.airnoir.islandia.full`、entitlement `full`（已掛商品）。不使用 Offering，也不需要 App 專用共享密鑰（SDK 10 走 StoreKit 2）。
- Public SDK key 已設為 EAS 環境變數 `EXPO_PUBLIC_REVENUECAT_IOS_KEY`（production / preview / development）。這把 key 本來就會放進 App，不是秘密；`sk_` 開頭的 secret key 不能進 App 或 repo。
- Build 8 是第一個含付費與新名稱的 TestFlight 版本。

### 第二階段（登入與備份）進行中（2026-10-28）

程式碼、資料表、edge functions、Supabase 設定都完成，見 5.6。免費名額同日改為 5 個；地圖與模型上的晝夜／天氣遮罩以 `ATMOSPHERE_OVERLAYS` 關閉。

Expo Go 模擬器已驗證：啟動即匿名登入並推 130 筆；雲端把一筆改成較早日期後同步，該景點變成 order 1；刪除帳號後雲端使用者與資料清空、App 自動換新匿名帳號再備份。Apple／Google 按鈕在 Expo Go 不會出現（模組不在 Expo Go 裡），要用 TestFlight 或 development build 測。Build 10 = 第一個含登入的版本（Apple + 匿名；Google 尚未設定所以按鈕隱藏）。

### 下一步

1. Google Cloud 建 iOS 與 Web OAuth client，回填 `app.json`、EAS 環境變數、Supabase Google provider（5.6 第 1 點）。
2. 出 TestFlight build，真機測 Apple 登入、合併、登出、刪除帳號；Google 等第 1 點完成。
3. 沙盒購買測試已通過（2026-10-27）；下一個 build 前先在手機「設定 → App Store → 沙盒帳號」清除購買紀錄，才看得到封存。
4. 第一個內購要和 App 版本一起送審：送審時在版本頁勾選 `com.airnoir.islandia.full`。
