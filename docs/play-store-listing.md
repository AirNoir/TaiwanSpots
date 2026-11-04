# Google Play 商店資訊

本文件提供 Play Console 填寫所需的繁體中文商店資訊、政策表單答案及審查說明。

## 1. 商店資訊

### 應用程式名稱（30 字內）
**微縮台灣：走到哪收藏到哪**

### 簡短說明（80 字內）
走到景點就解鎖一座微縮模型，把台灣收進口袋。130 個景點等你探索！

### 完整說明（4000 字內）

微縮台灣把台灣做成一座可以收藏的小島。

走到景點、用定位打卡，就能解鎖那個地方的可愛微縮模型：台北 101、九份老街、日月潭、太魯閣、蘭嶼⋯⋯全台 130 個景點，北中南東都有。

**主要功能**

• 地圖上看自己走過哪裡、還有哪些沒去
• 收藏後可以放大看模型細節
• 走到景點附近時，會提醒你可以打卡
• 加入照片，記錄每個景點的回憶

適合喜歡旅行、喜歡收集、想把台灣走一遍的人。

**關於內購**

App 免費下載，前 5 個景點免費收藏。之後的景點需要一次性購買「完整版」（NT$190）解鎖，沒有訂閱、沒有廣告。

**隱私與資料**

• 定位只在 App 開啟時使用，不會存到伺服器
• 照片只存在手機上，不會上傳
• 可選擇用 Google 帳號登入備份收藏紀錄

---

## 2. 資料安全性表單

根據 `docs/privacy.md` 和隱私權政策（https://islandia.littlestep.me/privacy），填寫如下：

### 收集或分享資料？
**是**，App 收集以下資料：

| 資料類型 | 是否收集 | 是否分享給第三方 | 用途 | 選填或必要 |
|---------|---------|----------------|------|-----------|
| 個人資訊 › 電子郵件地址 | 是（Google 登入時；回報問題時選填） | 否 | 應用程式功能、帳戶管理、開發人員通訊 | 選填 |
| 個人資訊 › 使用者 ID | 是（Supabase 匿名帳號、RevenueCat ID） | 否 | 應用程式功能、帳戶管理 | 必要 |
| 財務資訊 › 購買記錄 | 是（RevenueCat 記錄內購） | 否 | 應用程式功能 | 必要（購買完整版時） |
| 訊息 › 其他應用程式內訊息 | 是（使用者提交的回報內容） | 否 | 開發人員通訊 | 選填 |
| 應用程式活動 › 其他使用者產生的內容 | 是（收藏紀錄備份到 Supabase） | 否 | 應用程式功能 | 必要（雲端同步時） |
| 應用程式資訊與效能 › 其他診斷資料 | 是（回報附帶的版本、系統、裝置資訊） | 否 | 分析（除錯） | 選填 |

**不收集的資料：**
- 位置：定位只在手機上計算，不上傳伺服器
- 相片和影片：照片只存在裝置上，不上傳
- 聯絡人
- 裝置或其他 ID

### 資料傳輸安全性
- **資料傳輸是否加密**：是（使用 TLS/HTTPS）
- **使用者能否要求刪除資料**：是（見下方「帳號刪除」）

### 服務供應商說明
RevenueCat 和 Supabase 是代開發者處理資料的「服務供應商」，不算「分享給第三方」。

---

## 3. 應用程式內容表單

### 隱私權政策網址
https://islandia.littlestep.me/privacy

**注意**：隱私權政策頁面需要說明：
- 同時適用於 iOS 與 Android
- Google Play 付款的說明（RevenueCat 透過 Google Play Billing 處理購買）

### 應用程式存取權
選擇：**部分功能受限**

**說明**：
審查人員不需要帳號，點擊「開始體驗」→「模擬位置」就能收藏景點並測試內購功能。

詳細試玩流程見下方「審查人員試玩說明」。

### 廣告
**不含廣告**

### 內容分級
使用 IARC 問卷填寫，建議答案：

| 問題 | 回答 |
|-----|------|
| 是否包含暴力內容 | 否 |
| 是否包含性或裸露內容 | 否 |
| 是否包含粗話 | 否 |
| 是否包含恐怖、恐懼或驚嚇內容 | 否 |
| 是否包含賭博或模擬賭博 | 否 |
| **使用者之間能否互相通訊** | **否**（回報只送給開發者，使用者之間無法互動） |
| **是否分享使用者的位置資訊** | **否**（位置只在手機上使用，不上傳） |
| **是否有數位商品購買** | **是**（一次性內購：完整版） |

預期分級：**適合所有人**或**PEGI 3 / 分級保護 0+**

### 目標對象與年齡
- **目標年齡**：13 歲以上
- **理由**：避免適用 Google Play「家庭」政策的額外審查要求

### 政府應用程式
否

### 新聞應用程式
否

### 健康應用程式
否

---

## 4. 帳號刪除

Play 政策要求提供帳號刪除方式。

### App 內刪除帳號功能
檢查 `src/auth.ts` 和 `app/(tabs)/me.tsx`：
- 若 App 內已有「登出」或「刪除帳號」功能，在此說明操作路徑
- 若無，需在官網提供刪除說明頁面

### 官網刪除說明頁
在官網新增 `/delete-account` 頁面（`../taiwanspots-official-site`），內容如下：

---

**刪除帳號**

微縮台灣使用 Google 登入備份收藏紀錄。若要刪除帳號：

1. 在 App 內：打開「我的」分頁，點擊「登出」。登出後雲端備份的收藏紀錄將在 30 天後自動刪除。
2. 若需立即刪除，請寄信到 support@littlestep.me，主旨填寫「刪除帳號」，並提供您的 Google 帳號信箱。我們將在 7 個工作天內處理。

刪除帳號後：
- 雲端備份的收藏紀錄將被刪除
- 手機上的收藏紀錄不受影響（除非重新安裝 App）
- 透過 Google Play 購買的「完整版」不受影響，可用「恢復購買」功能找回

---

**Play Console 填寫**：網址填 `https://islandia.littlestep.me/delete-account`

---

## 5. 審查人員試玩說明（App 存取權附註）

以下為繁體中文與英文雙語說明，改寫自 `docs/app-review.md`：

---

### 【中文】

微縮台灣是收藏遊戲：使用者走到景點的打卡範圍內、用定位打卡，就能解鎖那個台灣地標的微縮模型。審查人員不在台灣、到不了景點，所以 App 有一個所有使用者都能用的「體驗模式」。

**完整流程：**

1. 走完簡短的新手導覽（定位權限可以不允許）。
2. 打開最右邊的「我的」分頁，在「體驗模式」卡片按「開始體驗」並確認。
3. App 換成一本有 4 個模型的體驗護照，並打開「探索」頁；頁面上的「模擬位置」卡片列出幾個地點，預設是「台北信義」。
4. 打開標著「可收藏」的「台北 101」，按「留下足跡」：會播放解鎖動畫，按「加入收藏」，第 5 個免費模型加入護照。
5. 返回，用同樣方式收藏「象山」（也標著「可收藏」）：超過 5 個免費名額後，新模型會封存，並出現一次性購買「完整版」（`com.airnoir.islandia.full`，NT$190）的付費頁，可用測試帳號購買或回復，買了會打開所有封存的模型。
6. 在「我的」頁（或首頁的橫幅）按「結束體驗」：體驗護照刪除，使用者原本的護照回來。

**其他說明：**
- Google 登入是選用的，只用來備份護照，不登入也能使用全部功能。
- 定位只在 App 開著時使用，不會存到伺服器，也不會傳給天氣服務。
- 景點照片只存在手機上。
- 問題回報在「我的」頁的「回報問題・建議」。

---

### 【English】

Islandia is a collection game: you unlock a miniature diorama of a Taiwan landmark by checking in with your location while you are within the spot's check-in radius. Reviewers outside Taiwan can't reach a spot, so the app has a Try mode that any user can open.

**To try the full flow:**

1. Finish the short intro (allowing location is optional).
2. Open the ME tab (rightmost) and tap "Start trying" on the Try mode card, then confirm.
3. The app switches to a sample passport with 4 models and opens Explore, where a "Simulated location" card lists sample places. "Taipei Xinyi" is preselected.
4. Open Taipei 101 (marked "In range") and tap "Collect": the unlock moment plays; tap "Add to collection" and the 5th free model joins the passport.
5. Go back, open Elephant Mountain (also "In range") and collect it the same way: past the free five a new model arrives sealed and the paywall offers the one-time purchase "Islandia Full" (`com.airnoir.islandia.full`, NT$190). It can be bought or restored with a test account; buying it opens every sealed model.
6. Tap "End try mode" on the ME tab (or the banner on the World tab): the sample passport is deleted and the user's own passport comes back.

**Other notes:**
- Sign in with Google is optional and only backs up the passport; the app works fully without an account.
- Location is used only while the app is open; it is never stored on our servers or sent to the weather service.
- Photos attached to spots stay on the device.
- Problem reports: "Report a problem or suggest" on the ME tab.

---

## 6. 圖像素材

| 項目 | 規格 | 存放位置 | 製作說明 |
|-----|------|---------|---------|
| 應用程式圖示 | 512×512 PNG | `store/play/` | 從 `assets/` 的 App icon 輸出 |
| 主題圖片（必備） | 1024×500 JPG/PNG，不可透明 | `store/play/` | 改 `store/marketing/templates/hero2.html` 的版面，用 `render.mjs` 輸出 |
| 手機螢幕截圖 | 2～8 張；16:9 或 9:16；建議 1080×1920 | `store/play/screenshots/` | ⏳ Android 版 build 後，在 Pixel 模擬器拍攝，套用 `store/marketing/templates/shot2.html` 的標題。**不可用 iPhone 截圖** |
| 平板截圖（選填） | 7 吋、10 吋 | `store/play/screenshots/` | 提供後 App 會被推薦給平板使用者 |

---

## 7. 檢查清單

上傳到 Play Console 前確認：

- [ ] 隱私權政策頁面已更新，說明同時適用 iOS 與 Android
- [ ] 官網已新增 `/delete-account` 頁面
- [ ] 主題圖片、截圖已準備好（Android 風格，不能用 iPhone 截圖）
- [ ] 完整說明已去除 iOS 專屬字眼（Widget、Apple 登入、鎖定畫面等）
- [ ] 審查說明已填寫，說明體驗模式的試玩流程

---

_最後更新：2026-11-04_
