# 1 km 收藏半徑、導航、天氣與四季

2026-10-15 加入的三個功能，以及它們的設計取捨。程式碼位置用 `路徑` 標示。

## 1. 收藏半徑擴到 1 km

**規則**：每個景點至少 1 km 內就能收藏；景點自己設定更大的半徑（國家公園、山區，最大 1.5 km）照舊。

- 單一入口 `src/geo.ts` 的 `checkinRadius(spot)` = `max(spot.checkinRadius, MIN_CHECKIN_RADIUS)`，`MIN_CHECKIN_RADIUS = 1000`。
- 用到的地方：景點頁的「可收藏」判定與文案、Explore 列表的「● 可收藏」、Live Activity 的「你在附近」門檻（`src/widgets/sync.ts`）。
- 沒有逐筆改 `src/data/spots.ts` 的 159 個數字：資料保留原本「這個景點本身多大」的語意，1 km 是產品規則，改一個常數就能再調。
- 副作用：市區（台北信義、台南中西區）會有多個景點同時在範圍內。Live Activity 只會顯示最近的一個未收藏景點，這是原本的行為。

## 2. 導航（Apple 地圖 / Google 地圖）

**UI**：景點頁未收藏卡片的「留下足跡」下方多一顆外框按鈕「步行導航 / 開車導航」；已收藏卡片有一行小字「導航再訪 · 距離」。1.5 km 內用步行，超過用開車（`travelModeFor`）。

**開啟策略**（`src/maps.ts`）：

| 平台 | 順序 |
|---|---|
| iOS，只有 Apple 地圖 | `maps://?daddr=lat,lng&dirflg=w/d` |
| iOS，也裝了 Google 地圖 | 先跳 ActionSheet 選 Apple / Google；Google 用 `comgooglemaps://?daddr=…&directionsmode=…` |
| Android | `google.navigation:q=lat,lng&mode=w/d` → `geo:lat,lng?q=lat,lng(名稱)` → 網頁版 Google Maps |

- 任何一層開不起來就自動退到下一層，最後是 `https://www.google.com/maps/dir/?api=1&destination=…`，一定能開。
- iOS 要能偵測 Google 地圖，`app.json` 的 `ios.infoPlist.LSApplicationQueriesSchemes` 加了 `comgooglemaps`。**這是原生設定，需要重新 EAS build 才會生效。**
- 不在 App 內畫路線、不傳任何東西給我們的伺服器；只是把景點座標交給手機的地圖 App。

## 3. 天氣與四季

### 季節

`src/atmosphere.ts` 的 `seasonOf(date)` 依月份：3–5 春、6–8 夏、9–11 秋、12–2 冬（中央氣象署慣例）。不用網路。

### 天氣

- 來源 Open-Meteo（免費、不用金鑰）。只查**固定座標**：首頁查北中南東四個城市中心（`src/data/world.ts` 的 `regions[].center`），景點頁查該景點本身。使用者位置永遠不送出，隱私權政策已同步更新（`docs/privacy.md`）。
- 一次請求可帶多個座標，所以首頁是 1 個 request 拿 4 區。
- `useWeather(points)`：記憶體 + AsyncStorage 快取 30 分鐘，座標以 0.01° 分桶（約 1 km，相近景點共用一筆）；離線時顯示上次的值，完全沒資料時就不顯示天氣，只顯示季節。
- WMO 天氣代碼對應到 8 種天空：晴、多雲、陰、霧、毛毛雨、雨、雷雨、雪。

### 看得到的變化

**台灣世界（首頁地圖，`src/components/TaiwanWorld.tsx`）**

| 季節 | 已探索的山脈與綠意 | 額外 |
|---|---|---|
| 春 | 嫩黃綠 | 收藏過的景點旁散落粉色花瓣 |
| 夏 | 飽和深綠 | — |
| 秋 | 赭黃、橙褐 | — |
| 冬 | 灰綠、低飽和 | 中央山脈最高的 30% 山峰加白色雪頂 |

未探索的土地維持灰色起霧，季節只上在「去過的地方」，符合原本「去過才上色」的規則。

天氣逐區疊在地圖上：多雲／陰／霧是區域上方的雲朵，下雨是會落下的雨絲（毛毛雨少、雷雨多），下雪是雪點。雷雨另外每隔幾秒閃電一次：整區泛一道白光、雲下掉一道閃電（`src/components/lightning.ts` 的時序：硬閃、顫一下、再弱閃一次、暗掉），景點頁上的模型整張跟著閃。四個區域 chip 多了天氣圖示和溫度；放大某區時右上角顯示該區天氣。

**微縮模型（`src/components/Diorama.tsx`）**

- 季節色調：春 粉、秋 橙、冬 冷藍的低透明度色罩；夏天不加。
- 景點頁上的「活」模型，如果該景點現在在下雨，模型上方會下雨。

**收藏變體（這是真正的收集機制）**

- 打卡時把當下的季節、天空、溫度寫進 `CollectionEntry`（`season`、`sky`、`temperature`）。
- 已收藏的模型永遠帶著**收藏當時**的季節色；未收藏的顯示今天的。同一個景點，春天和冬天收到的樣子不同。
- 景點頁「SPRING VARIANT · 多雲 24°」、分享卡、護照格子都用這個資訊。
- 舊資料沒有 `season` 欄位，用 `entrySeason(entry)` 從打卡日期推回去，不需要 migration。
- 新成就「FOUR SEASONS 春夏秋冬都留下足跡」。

### 日夜

- 夜晚判定順序：開發用覆寫 → Open-Meteo 的 `is_day` → 本機時鐘（18:00–06:00）。
- 世界地圖：整張蓋一層深藍紗（`nightVeil`）加星點，地標 token 和光點在紗上面；夜晚光點更亮，但收藏數超過 40／80 個時光點會縮小，免得蓋住地形。
- 微縮模型：深藍色罩 + 幾顆星；程序式（還沒生圖的）模型把天空換成夜空、太陽換成月亮。
- 景點頁和首頁的季節標籤會變成「秋夜」「春日」這種寫法。

### 開發預覽：四季 × 日夜 × 天氣

- ME 分頁最下面（只在開發版出現）有三排 chip：季節（自動／春／夏／秋／冬）、日夜（自動／白天／夜晚）、天氣（自動／晴／多雲／陰／霧／雨／雷雨／雪）。選了之後所有畫面都跟著變，包括已收藏模型的季節色；回到「自動」就恢復。
- 深連結：`exp://<host>/--/dev/atmosphere?season=winter&night=1&sky=snow`，`?reset=1` 清除。**不要在 Expo Go 還在打包時連續丟深連結**，會卡白畫面；要用就等它載完再一個一個開。
- 自動化（截圖、測試）走 Metro 的 Hermes inspector：開發版會把 `useStore` 掛在 `globalThis.__islandia`、expo-router 的 `router` 掛在 `globalThis.__islandiaRouter`，用 CDP `Runtime.evaluate` 就能切狀態和換頁，不需要重新載入。連線時 `Origin` 要帶 `http://127.0.0.1:8081`，否則 inspector proxy 回 401。
- 正式版（`__DEV__` 為 false）這些覆寫和全域變數都不存在。

## 沒做、可以接著做

- Widget 顯示天氣（需要把天氣寫進 App Group，順手可做）。
- 季節限定收藏（例如某景點只在冬天解鎖「雪景」版本）。
- 天氣查詢的開關（目前沒有設定可關，隱私政策已揭露）。

## 驗證

- `npx tsc --noEmit`、`npx expo lint` 通過。
- 需要實機：導航 ActionSheet 與 URL 在有／沒有 Google 地圖時的行為；Android 的 `google.navigation:` 。模擬器可用 Explore 的 DEV 位置或景點頁的「DEV・模擬抵達這裡」測 1 km 判定。
- 天氣在模擬器就看得到（需要網路）；要看雨，挑一個當下在下雨的區域。
