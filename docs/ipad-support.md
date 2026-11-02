# iPad 與 iPhone Duo 支援

2026-10-29 決定：**微縮台灣必須支援 iPad**，第一版上架就要有。2026-11-02 版面改完（下方「已完成」），`supportsTablet` 已打開，**還沒 build**。同時把 iPhone Duo（摺疊 iPhone，2026-10-23 上市）一起考慮進去。

## 原則（iPad 與 iPhone Duo 共用）

依 Apple「Designing for iPhone Duo」與 Layout 的建議：

- **跟著視窗尺寸走，不看裝置、不看方向。** iPad 分割畫面、台前調度、Duo 開合都會改變視窗大小；iOS 27 起方向鎖定只是「偏好」，Duo 內螢幕不理會支援方向。所以寬高都在 render 時讀（`useWindowDimensions`），不在模組載入時讀 `Dimensions.get`。
- **加寬就加欄、加留白，不放大字。** 字級、按鈕維持手機尺寸；內容欄有上限，置中。
- **左右安全區域也要算。** Duo 的分頁列／工具列會移到側邊（rail），內容要避開。
- **格子用偶數欄**（4、6），Duo 半摺時能從中間整齊分開。

工具都在 `src/layout.ts`：`useLayout()`（`usable` 寬、`regular`、`column()`、`gutter()`）、`gridColumns()`（手機 3、≥600pt 4、≥900pt 6）、`tileSize()`。

## 已完成（2026-11-02）

| 畫面 | 手機 | iPad／Duo 內螢幕 |
|---|---|---|
| 首頁 | 不變 | 內容欄最寬 760pt 置中；地圖寬度取「欄寬」與「螢幕高 − 220 換算」的較小者，整座島一定放得下（iPad 橫向、Duo 外螢幕這種矮螢幕也是） |
| 護照 | 3 欄 | 4 欄（iPad mini、Duo 內螢幕）、6 欄（iPad 13"），格子區最寬 1100pt |
| 探索、我的 | 不變 | 內容欄最寬 680pt 置中 |
| 景點頁（sheet） | 不變 | 依 sheet 自己量到的寬度排版（iPad 上 sheet 比視窗窄）；模型圖最多半個螢幕高，名稱與打卡卡片留在第一屏 |
| 新手導覽 | 不變 | 每頁寬度跟著實際寬度；地圖最寬 420pt；按鈕區最寬 520pt |
| 加照片選單 | 不變 | 底部選單最寬 560pt 置中 |
| 那天的照片（選圖格） | 3 欄 | 依 sheet 寬度 4／6 欄 |
| 照片檢視、分享卡、解鎖動畫、全部開封 | 不變 | 讀即時視窗尺寸；分享卡預覽在 iPad 上可到原尺寸 540pt；解鎖模型最大 400pt |

- `app.json`：`ios.supportsTablet: true`。Expo 產生的 Info.plist：iPad 支援四個方向、`UIRequiresFullScreen false`（iPad 多工必要），所以 **iPad 會轉橫向**；版面都以寬高計算，不假設直向。
- 驗證：iPad Pro 13" (M4)、iPad mini (A17 Pro)、iPhone 16 Pro Max 模擬器（Expo Go）。手機畫面與改動前一致。
- 沒驗證到：iPad 橫向（模擬器不能從指令列旋轉）、分割畫面、真機。下一個 build 在 iPad 上手動轉一次。
- 注意：一旦送出支援 iPad 的版本，之後的版本就不能再拿掉 iPad 支援。

## 還要做

1. **Build 並在 iPad 上實測**（使用者說了才 build）：直向、橫向、分割畫面 1/2 與 1/3、台前調度拖拉大小。
2. **iPad 13 吋截圖**（App 支援 iPad 時為必填，2064×2752 或 2048×2732），用 iPad Pro 13-inch (M4) 模擬器拍，存到 `store/screenshots/zh-Hant/ipad-13/`。
3. Widget、Live Activity：確認 iPad 上的小工具尺寸（`src/widgets/`）。

## iPhone Duo（第二階段）

現況：Duo 是 iPhone，我們的 App 已經會在上面跑；外螢幕 1398×2034px（約 466×678pt，比一般 iPhone 寬又矮）、內螢幕 2007×2853px（約 669×951pt，接近 iPad mini）。上面的彈性版面已經涵蓋這兩種尺寸（矮螢幕地圖縮小、內螢幕 4 欄）。

Apple：**2027 年 4 月起，用 iOS 27.1 SDK 以上建置的 App 必須附 Duo 截圖**；附了截圖的 App 在 App Store 會有「為 iPhone Duo 最佳化」標章。

要做到「為 Duo 最佳化」需要：

1. **升級 Expo SDK 58**（為 iOS 27／Duo 而做，EAS 映像用 `sdk-58` 或 `latest`，Xcode 27.1 才有 Duo 模擬器與 Device Hub 摺疊測試）。這是一次 SDK 大升級，要獨立排時間，照 Expo 升級指南逐步做。
2. **分頁列改用 Expo Router 的 `NativeTabs`**：系統才會把分頁列放到 Duo 的側邊 rail（目前是 JS 版 `Tabs`，不會自動移）。
3. **左右安全區域**：rail 在側邊時，`SafeAreaView` 要含 `left`/`right`（這次已加在四個分頁與景點頁）；地圖的浮動標籤、底部選單要檢查。
4. **摺痕（reserved region）**：半摺時內容避開中間。護照已是偶數欄；地圖若被摺痕切到，可考慮 `react-native-reserved-regions`。
5. **開合不掉狀態**：開／闔時停在同一頁、同一捲動位置（Expo Router 本身會保留，需實測）。
6. **Duo 截圖**：外螢幕 1398×2034、內螢幕 2007×2853。

參考：Apple HIG「Designing for iPhone Duo」、App Store Connect「Screenshot specifications」、Expo blog「Supporting iPhone Duo」。

## 模擬器拍攝備忘

- iPad Pro 13-inch (M4) udid `2E6330F5-5E9D-43A7-BB4E-0E4500E488CE`、iPad mini (A17 Pro) udid `A496655A-9995-4643-9E20-351E611270CA`，都已裝 Expo Go、關掉懸浮齒輪（`defaults write host.exp.Exponent EXDevMenuShowFloatingActionButton -bool NO`）、語言設繁中。
- 開專案不要用 `simctl openurl`（會跳「Open in Expo Go?」要手點），改用 `xcrun simctl launch <udid> host.exp.Exponent --initialUrl exp://127.0.0.1:8081`。
- 改了 `app/spot/[id].tsx` 之類的 lazy 路由後，Fast Refresh 可能失敗（LogBox：`TypeError: <n> is not a function`，堆疊在 expo-router 的 `injectUpdate`），畫面會停在舊程式碼：把 Expo Go 關掉重開。
- 進去後用 Metro inspector 呼叫 `__islandiaDemo()` 載入示範護照，再用 `__islandiaRouter` 切頁、`xcrun simctl io <udid> screenshot` 拍。
