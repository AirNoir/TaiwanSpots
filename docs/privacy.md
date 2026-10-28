# 微縮台灣 Islandia 隱私權政策 / Privacy Policy

最後更新：2026-10-28

## 中文

微縮台灣（英文名 Islandia）是一個用定位打卡、收藏台灣景點微縮模型的 App。

**我們收集什麼**

- **位置資訊**：只在你打開 App 時使用，用來判斷你是否抵達景點、以及在主畫面 Widget 和鎖定畫面顯示最近的景點距離。位置資料只在你的裝置上計算，不會上傳到任何伺服器。
- **收藏紀錄**：你解鎖過哪些景點、解鎖時間與順序、當時的季節與天氣，儲存在你的裝置上（以及 App 與 Widget 共用的 App Group 容器）。
- **帳號與備份**：App 第一次開啟時會在背景建立一個匿名帳號，把你的收藏紀錄備份到我們的雲端（Supabase，資料存放於東京）。你可以在「我的」頁用 Apple 或 Google 帳號登入；此時我們只會收到該帳號提供的電子郵件（Apple 可選擇隱藏）與一組識別碼，用來讓你換手機時找回收藏。備份內容只有上面的收藏紀錄，不含位置。

**天氣查詢**

為了顯示景點與各區域目前的天氣，App 會向 Open-Meteo（open-meteo.com）查詢「景點本身」和「北、中、南、東四個城市中心」的固定座標。這些是公開地標座標，不是你的位置；請求不含任何帳號或裝置識別資訊，結果會在裝置上快取 30 分鐘。點「導航」時，App 只是把景點座標交給你手機上的地圖 App 開啟。

**我們不做什麼**

- 不收集姓名或聯絡方式；電子郵件只用來識別你的登入帳號，不寄送郵件、不用於行銷。
- 不使用第三方分析或廣告 SDK。
- 除了上述天氣查詢與收藏備份，不把任何資料傳送到我們或第三方的伺服器。位置資料永遠不上傳。

**資料刪除**

在「我的」頁按「刪除帳號」會立即刪除雲端上的帳號與收藏備份；刪除 App 則刪除裝置上的所有資料。沒有登入過的匿名帳號在 30 天沒有使用後會自動刪除。

**聯絡**

有任何問題請到 https://github.com/AirNoir/TaiwanSpots 開 issue。

## English

Islandia is an app that unlocks miniature dioramas of Taiwanese landmarks when you check in at them.

**What we collect**

- **Location**: used only while the app is open, to decide whether you have reached a spot and to show the nearest spot on the widget and lock screen. Location is processed on your device and is never uploaded.
- **Collection progress**: which spots you have unlocked, when, in what order, and the season and weather at the time. Stored on your device and in the App Group container shared with the widget.
- **Account and backup**: on first launch the app silently creates an anonymous account and backs up your collection progress to our cloud (Supabase, hosted in Tokyo). On the Me tab you can sign in with Apple or Google; we then receive only the email that account shares (Apple lets you hide it) and an identifier, used to bring your passport back on a new phone. The backup holds the collection progress above and nothing else; never your location.

**Weather lookups**

To show current weather for spots and regions, the app queries Open-Meteo (open-meteo.com) for the fixed coordinates of the spot itself and of four city centres (north, central, south, east). These are public landmark coordinates, not your location; the request carries no account or device identifier, and results are cached on the device for 30 minutes. Tapping "Navigate" simply hands the spot's coordinates to the maps app on your phone.

**What we do not do**

- No names or contact details; an email serves only to identify your sign-in account and is never used for mail or marketing.
- No third-party analytics or advertising SDKs.
- Apart from the weather lookups and the passport backup above, no data is sent to our servers or to anyone else's. Location is never uploaded.

**Deleting your data**

"Delete account" on the Me tab removes the account and its backup from the cloud at once; deleting the app removes everything on the device. Anonymous accounts that never signed in are removed automatically after 30 days of inactivity.

**Contact**

Open an issue at https://github.com/AirNoir/TaiwanSpots.
