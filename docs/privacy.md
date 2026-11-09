# 微縮台灣 Islandia 隱私權政策 / Privacy Policy

最後更新：2026-11-09 · 正式網址 https://islandia.littlestep.me/privacy（本檔為同步副本，頁面原始碼在 `site/privacy.html`）

刪除帳號的步驟與保留項目：https://islandia.littlestep.me/delete-account（`site/delete-account.html`）

適用於 iOS 與 Android App「微縮台灣」（英文名 Islandia，開發者 AirNoir，Android 套件 `com.airnoir.islandia`）。

## 中文

微縮台灣是一個用定位打卡、收藏台灣景點微縮模型的 App。iOS 與 Android 適用同一份政策；兩邊做法不同的地方會標出來。

**我們收集什麼**

- **位置資訊**：只在使用 App 時讀取（iOS 為「使用期間」；Android 為大致與精確定位，沒有背景定位），用來判斷是否抵達景點。iOS 另用於主畫面小工具和鎖定畫面；Android 這次沒有小工具。打卡判斷在裝置上完成。我們的伺服器不接收 GPS 座標，也不保存位置軌跡。
- **地圖**：App 內地圖只標出景點，不算路線。iOS 底圖是 Apple 地圖。Android 底圖使用 Google Maps SDK for Android，裝置會向 Google 索取正在看的地圖圖磚；允許定位時，藍點由該地圖 SDK 繪製。點「導航」只把景點的公開座標交給手機上的地圖 App。
- **收藏紀錄**：解鎖過哪些景點、時間與順序、當時的季節與天氣。存在裝置上（iOS 另存在與小工具共用的 App Group）。
- **帳號與備份**：第一次開啟時在背景建立匿名 Supabase 帳號，把收藏紀錄備份到雲端（Supabase，東京）。備份不含位置與照片。iOS 可在「我的」頁用 Apple 或 Google 登入；Android 用 Google 登入（沒有 Apple 登入）。我們只收到該帳號提供的電子郵件（Apple 可隱藏）與一組識別碼。
- **用 Google 帳號登入時**：只要求基本個人資料範圍（電子郵件、識別碼）。不存取 Google 聯絡人、雲端硬碟、日曆或其他 Google 資料，也不分享給廣告商。電子郵件不用於行銷。
- **照片與相機**：每座景點最多 3 張，只存在手機，不上傳，不在雲端備份中。存檔會重新壓縮，不保留拍攝位置等中繼資料。相機只有在拍照時才詢問。iOS 在選照片或存分享卡時才詢問相簿。Android 用系統照片選擇器，不申請讀取整個相簿；「當天拍的照片」和「在這附近拍的照片」只在 iOS。
- **產品使用與裝置資訊**：寫進我們自己的 Supabase（東京），不是第三方分析服務。每天第一次打開或回到 App：平台、裝置型號、系統版本、App 版本、語言、是否為開發版、是否完整版、手機上的收藏數量。使用功能時：完成導覽、打卡（景點編號，不含座標）、看付費牆、購買或恢復的結果、分享、加入照片、打開導航。不含位置、照片或廣告識別碼，不用於廣告，帳號刪除時一併刪除。
- **回報問題與建議**：只有主動送出時才收到內容、選填的回覆電子郵件、相關景點，以及 App 版本、系統版本、裝置類型、語言、是否完整版、已收藏數量。不含位置、照片或裝置識別碼。只有我們看得到；電子郵件只用來回覆該則回報。

**天氣查詢**

為了顯示景點與各區域的天氣，App 向 Open-Meteo（open-meteo.com）查詢景點本身和北、中、南、東四個城市中心的固定座標。這些不是使用者的位置；請求不含帳號或裝置識別資訊，結果在裝置上快取 30 分鐘。

**我們不做什麼**

- 不收集姓名。登入與回報用的電子郵件都不用於行銷。
- 不使用廣告 SDK，也不使用第三方分析 SDK。
- 不把 GPS 座標上傳到我們的伺服器。

**App 內購買**

完整版是一次買斷，商品 `com.airnoir.islandia.full`，不是訂閱。iOS 由 App Store 收款，Android 由 Google Play Billing 收款，兩邊都透過 RevenueCat 確認購買狀態。我們看不到付款卡號。RevenueCat 只收到商店的匿名交易資訊，以及購買 SDK 產生的隨機使用者識別碼，不含電子郵件或位置。

**資料刪除**

用 Apple 或 Google 登入後，在「我的」→「備份」按「刪除帳號」，會立刻刪除雲端帳號、收藏備份，以及裝置與產品使用紀錄。沒有帶著 App 時寄信到 support@littlestep.me。步驟與保留項目見 https://islandia.littlestep.me/delete-account 。

刪除帳號不會清掉手機上的收藏和照片；刪除 App 才會。從未登入的匿名帳號在 30 天沒有使用後自動刪除。已送出的問題回報會留下，但不再連結到帳號。商店與 RevenueCat 的購買紀錄依他們的政策保留，刪除帳號不會退款。

**聯絡**

support@littlestep.me，或在 App 的「我的」頁按「回報問題・建議」。

## English

Islandia unlocks miniature dioramas of Taiwanese landmarks when you check in. The same policy covers iOS and Android.

**What we collect**

- **Location**: only while the app is in use (iOS: While Using; Android: approximate and precise, never background), to decide whether you have reached a spot. iOS also uses it for the widget and lock screen; this Android release has no widget. The check-in decision stays on the device. Our servers never receive GPS coordinates, and we keep no location trail.
- **Maps**: the in-app map only marks spots. iOS uses Apple Maps. Android uses the Google Maps SDK for Android, so the device requests map tiles from Google; with location allowed, the blue dot is drawn by that SDK. “Navigate” only hands the spot’s public coordinates to the phone’s maps app.
- **Collection progress**: which spots, when, in what order, and the season and weather. Stored on the device (and, on iOS, in the App Group shared with the widget).
- **Account and backup**: first launch creates an anonymous Supabase account and backs up the collection (Supabase, Tokyo). No location and no photos. Sign in with Apple or Google on iOS; Google Sign-In on Android. We receive only the email that account shares (Apple can hide it) and an identifier.
- **Google sign-in**: basic profile scopes only (email and identifier). No contacts, Drive, Calendar or other Google data, and no sharing with advertisers.
- **Photos and camera**: up to 3 photos per spot, on the phone only, never uploaded. Re-encoded so the original metadata is dropped. The camera is requested only to take a photo. iOS asks for the photo library only when picking a photo or saving a share card. Android uses the system photo picker and does not request full library access. “Photos from that day” and “photos taken nearby” are iOS only.
- **Product use and device information**: written to our own Supabase project, not a third-party analytics service. Once a day: platform, device model, OS version, app version, language, whether it is a development build, whether the full version is owned, and how many spots are on the phone. On certain actions: onboarding, check-in (spot id, not coordinates), paywall, purchase or restore result, share, photo added, directions opened. No location, photos or advertising id. Deleted with the account.
- **Problem reports**: only when you send one. The text, an optional reply email, the related spot, and app version, OS version, device type, language, full-version flag and collection count. No location, photos or device identifiers.

**Weather lookups**

Open-Meteo is queried for the spot and for four city centres. Those coordinates are not the user’s location. Results are cached on the device for 30 minutes.

**What we do not do**

- No names. Sign-in and report emails are not used for marketing.
- No advertising SDKs and no third-party analytics SDKs.
- No upload of GPS coordinates to our servers.

**In-app purchase**

The full version is the one-time product `com.airnoir.islandia.full`. The App Store charges on iOS; Google Play Billing charges on Android. RevenueCat confirms the purchase and receives only anonymised store transaction data plus a random SDK user id, never the email or location. We never see the card number.

**Deleting your data**

After signing in with Apple or Google, Me → Backup → Delete account removes the cloud account, the backup, and the device and product-use records at once. Without the app, email support@littlestep.me. Details: https://islandia.littlestep.me/delete-account .

The phone’s collection and photos stay until the app is deleted. Anonymous accounts that never signed in are removed after 30 days without use. Reports already sent are kept but unlinked from the account. Store and RevenueCat purchase records follow their policies; deletion does not refund the purchase.

**Contact**

support@littlestep.me, or “Report a problem or suggest” on the Me tab.
