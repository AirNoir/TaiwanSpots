# App Review：審查備註與送審前的阻礙

2026-11-02 起草。送審時填在 App Store Connect →（版本頁）App Review Information，`store.config.json` 的 `apple.review` 也要同步（`eas metadata:push` 會覆蓋）。

## 送審前必須先解決（會被退件）

1. **審查人員沒辦法打卡。** 景點要人到現場（GPS 在打卡半徑內）才能收藏，審查人員在美國，不可能走到九份。Apple 準則 2.1 要求審查人員能用到 App 的主要功能，做不到幾乎一定退件。
   - `store.config.json` 目前的審查備註寫「用 `islandia://dev/unlock-all` 解鎖全部景點」，**但這個連結在正式版是 no-op**（`app/dev/unlock-all.tsx` 只在 `__DEV__` 生效），照做什麼都不會發生。
   - 示範護照（`islandia://dev/demo`）也只在 demo／開發版有，正式版同樣不作用。
2. **審查聯絡資料是假的。** `review.email` 是 `review-contact@example.com`、電話是 `+886 900 000 000`，要換成真的（審查有問題會直接聯絡）。

### 讓審查人員能體驗打卡：選項（待決定）

| 做法 | 審查人員體驗 | 風險 |
|---|---|---|
| A. 正式版加「審查示範」深連結（例如 `islandia://review?code=…`）：載入示範護照（不含已購買），並讓「探索」頁出現模擬位置（台北車站等），可以真的走一次打卡＋解鎖動畫＋封存／付費流程 | 完整：收藏、解鎖、分享卡、照片、內購都能測 | 連結外流的話，一般使用者也能用模擬位置打卡（只影響自己的收藏）；`code` 只寫在審查備註裡，降低外流 |
| B. 只附示範影片（App Review Information 可附影片） | 看得到流程，但自己測不到打卡 | Apple 常仍要求可操作的方式，退件機率中等 |
| C. 只寫說明「需到現場」 | 只能瀏覽地圖、探索、景點頁 | 退件機率高 |

建議 A（加影片當補充）。做法：沿用 `DEMO_TOOLS` 的元件，改成「建置時開啟（demo 版）或執行時由審查連結開啟」；審查模式載入示範護照時不要設 `simulatedFull`，讓審查人員測到真的內購（沙盒）。

## 審查備註草稿（英文，等 A 做完後定稿）

> Islandia is a collection game: you unlock a miniature diorama of a Taiwan landmark by checking in with your location when you are physically within the spot's check-in radius. Reviewers outside Taiwan can't reach any spot, so we added a review mode.
>
> To try the full flow:
> 1. Open this link on the review device (from Safari or Notes): islandia://review?code=XXXX
> 2. The app loads a sample passport with 38 collected spots, and the Explore tab shows location presets (Taipei Station, Taichung, Tainan, Hualien).
> 3. Tap "Taipei Station" in Explore, open a nearby uncollected spot (e.g. Ximending), and tap Check in to see the unlock moment. Past the first five free spots a new model arrives sealed; the paywall offers the one-time "Islandia Full" purchase (com.airnoir.islandia.full), which can be bought or restored in the sandbox.
>
> Sign-in (Apple / Google) is optional and only used to back up the passport; the app works fully without an account. Location is used only while the app is open and is never sent to our servers or to the weather service. Photos attached to spots stay on the device.

## 其他送審檢查

- 內購：版本頁 In-App Purchases 區塊勾選 `com.airnoir.islandia.full`（docs/spec.md §9 第 4 項）。
- App 隱私問卷：照片只存在手機（不收集）；位置用於 App 功能、不連結身分；登入的 email 用於帳號。要和 `docs/privacy.md`、官網隱私權政策一致。
- 截圖：iPhone 已備（`store/screenshots/`）；iPad 13 吋要等 iPad 版面在真的 build 上確認後再拍（`docs/ipad-support.md`）。
- 版本說明：已改成 130 個景點（2026-11-02），與 App 顯示一致（`SPOTS` 只算 `active` 的景點）。
