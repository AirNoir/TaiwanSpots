# iPad 支援（必做，上架前）

2026-10-29 決定：**微縮台灣必須支援 iPad**，第一版上架就要有。目前還沒做。

## 現況

- `app.json` 的 `ios.supportsTablet` 是 `false`，App 只標成 iPhone App；在 iPad 上會以 iPhone 相容模式（放大的手機畫面）執行，App Store Connect 也不會要求 iPad 截圖。
- 2026-10-29 在 iPad Pro 13" (M4) 模擬器（Expo Go 不管 `supportsTablet`，會用整個 iPad 畫面跑）試拍的結果：
  - 首頁地圖：地圖寬度跟著螢幕撐滿，台灣被放大、上下被裁掉，標記和數字變得很小。
  - 景點頁：iPad 上的 modal 是置中的 form sheet，模型圖照手機寬度算，被放得太大、被裁切。
  - 護照：格子照手機的三欄算，每格變得很大。
  - 探索：列表橫跨整個寬度，一行很長。
  - 分享卡：卡片偏小，置中，周圍大片空白（可接受，但可以再大）。
  - 文字整體太小（字級是手機用的）。

## 要做的事

1. 版面：所有用 `Dimensions.get('window')` / `useWindowDimensions` 算尺寸的地方改成「有最大寬度的內容欄」，iPad 上置中（或做兩欄）。用到的檔案：
   - `app/(tabs)/index.tsx`（地圖：依高度與寬度取較小者，讓整座島放得進去）
   - `app/(tabs)/passport.tsx`（格子欄數依寬度變成 4–6 欄）
   - `app/onboarding.tsx`
   - `app/spot/[id].tsx`（模型圖依內容欄寬度算，不是螢幕寬）
   - `src/components/DioramaViewer.tsx`、`UnlockOverlay.tsx`、`UnsealOverlay.tsx`
   - `src/components/ShareCardModal.tsx`（只影響預覽大小；輸出仍是 540pt 的卡片）
   - `src/components/PhotoStrip.tsx`、`PhotoViewer.tsx`、`DayPhotoPicker.tsx`
   - 這些檔案多半在模組層級讀一次 `Dimensions.get('window')`，iPad 分割畫面或旋轉時不會更新，要改成 `useWindowDimensions()`。
2. 方向：目前 `orientation: "portrait"`。iPad 只做直式也能上架，但 iPad 多工分割畫面會讓寬度變窄，版面要能接受任何寬度。
3. Widget、Live Activity：確認 iPad 上的小工具尺寸（`src/widgets/`）。
4. `app.json` 改 `ios.supportsTablet: true`。這會改 `UIDeviceFamily`，改完要 build 一次（使用者說了才 build）。注意：一旦送出支援 iPad 的版本，之後的版本就不能再拿掉 iPad 支援。
5. 截圖：App Store Connect 的「iPad 13 吋」在 App 支援 iPad 時為必填（2064×2752 或 2048×2732），用 iPad Pro 13-inch (M4) 模擬器拍，方法同 `store/screenshots/README.md`，存到 `store/screenshots/zh-Hant/ipad-13/`。

## 模擬器拍攝備忘

- iPad Pro 13-inch (M4) udid `2E6330F5-5E9D-43A7-BB4E-0E4500E488CE`，已裝 Expo Go、關掉懸浮齒輪（`defaults write host.exp.Exponent EXDevMenuShowFloatingActionButton -bool NO`）、語言設繁中。
- 開專案不要用 `simctl openurl`（會跳「Open in Expo Go?」要手點），改用 `xcrun simctl launch <udid> host.exp.Exponent --initialUrl exp://127.0.0.1:8081`。
- 進去後用 Metro inspector 呼叫 `__islandiaDemo()` 載入示範護照，再用 `__islandiaRouter` 切頁、`xcrun simctl io <udid> screenshot` 拍。
