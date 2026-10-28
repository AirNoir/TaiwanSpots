# Google 登入：OAuth client 設定步驟

**狀態（2026-10-28）**：全部完成。GCP 專案「微縮台灣」（專案編號 945989250610）的 iOS 與 Web client 已建好；`app.json` plugin、EAS 三個環境的 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`／`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`、`.env.local`、Supabase Google provider（Web 在前、iOS 在後、skip nonce check 開）都已回填。Build 11 是第一個含 Google 登入的 TestFlight 版本。Android client 還沒建（第 9 步）。

2026-10-28 依 Google Cloud 說明中心（Google Auth Platform：Get started／Branding／Audience／Clients）、
Supabase「Login with Google」與 `@react-native-google-signin` 文件核對。
App 端程式已在 `src/auth.ts`，只差這份設定；Build 10 的 Google 按鈕因此先隱藏。

官網網址（Google 要求首頁與隱私權政策同一網域、首頁連到隱私權）：

| 欄位 | 值 |
|---|---|
| Application home page | `https://islandia.littlestep.me/` |
| Application privacy policy link | `https://islandia.littlestep.me/privacy` |
| Application terms of service link | `https://islandia.littlestep.me/terms` |
| Authorized domain | `littlestep.me` |

## A. 新專案與同意畫面

開新專案，不要用小步腳印的：Google 登入面板顯示的 App 名稱來自專案的 Branding。

1. https://console.cloud.google.com → 上方專案選單 →「New project」→ Project name `微縮台灣` → Create → 通知出現後「Select project」。
2. 左側 ☰ →「Google Auth Platform」→「Overview」→「Get started」。
3. 精靈四步：
   - App Information：App name `微縮台灣`、User support email 選你的信箱 → Next。
   - Audience：**External** → Next。
   - Contact Information：填你的信箱 → Next。
   - Finish：勾同意 → Continue → Create。
4. 左側「Branding」：
   - App logo：**不要上傳**。文件明說 External 且 In production 的 App 上傳 logo 就要走驗證。
   - App domain：三個網址照上表填。
   - Authorized domains →「Add domain」→ `littlestep.me`。
   - Developer contact information：已帶入 → Save。
5. 左側「Audience」→ Publishing status「Testing」→「Publish app」→ Confirm。
   只用 email／profile／openid 不需要驗證。就算留在 Testing，只要基本資料範圍，任何人都能登入，沒有 100 名測試者與 7 天到期的限制；Publish 只是讓狀態乾淨。
6. 「Data Access」不用動，預設 openid／email／profile 就是我們要的。

## B. 建 client

7. 左側「Clients」→「Create client」：
   - Application type：**iOS**
   - Name：`微縮台灣 iOS`
   - Bundle ID：`com.airnoir.islandia`
   - App Store ID、Team ID：留空（表單只有 Bundle ID 必填）
   - Create。完成畫面有 **Client ID**（`數字-亂碼.apps.googleusercontent.com`）和 **iOS URL scheme**（`com.googleusercontent.apps.數字-亂碼`）。
8. 再「Create client」：
   - Application type：**Web application**
   - Name：`微縮台灣 Web`
   - Authorized JavaScript origins、Authorized redirect URIs：留空（原生登入用不到）
   - Create → 複製 **Client ID**。會一起給 Client secret，原生登入不需要，不要貼到任何地方。
   Android 拿 id token 要靠這個 Web client，現在先建好。
9. Android client 等要出 Android 版再建：Application type Android、Package name `com.airnoir.islandia`、SHA-1 用 `eas credentials -p android` 印出的 keystore 指紋。

## C. 要回填的地方

拿到 iOS Client ID 與 Web Client ID 後（都是公開值，會打包進 App）：

1. `app.json` plugins 加 `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<iOS id 前段>" }]`。
2. EAS 環境變數（plaintext，development／preview／production 三個都設）與 `.env.local`：
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`、`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`。
3. Supabase Google provider（Management API `PATCH /v1/projects/cbpljsnzqsucgjiinztk/config/auth`）：
   `external_google_enabled: true`、`external_google_client_id: "<web>,<ios>"`（Supabase 文件：Web 的放第一個）、
   `external_google_skip_nonce_check: true`（iOS 原生登入需要）。不需要 client secret。
4. 出 Build 11 到 TestFlight，真機測：Google 登入、合併、登出、刪除帳號。
