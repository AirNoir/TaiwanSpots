# 上 TestFlight（EAS Build + App Store Connect）

## 目前狀態（2026-10-14）

- EAS 專案 `@airnoir/islandia`（project id 在 `app.json` 的 `extra.eas.projectId`）。
- 憑證已經在 EAS 伺服器上：Distribution Certificate、`com.airnoir.islandia` 與 `com.airnoir.islandia.ExpoWidgetsTarget` 兩個 Provisioning Profile、App Group `group.com.airnoir.islandia`。
- App Store Connect 已有 App 記錄：**ASC App ID `6822659015`**（已寫進 `eas.json` 的 `submit.production.ios.ascAppId`）。
  建立時「Islandia」這個名字已被別的 App 用掉，ASC 先給了暫名 `Islandia (c066e2)`；真正的名稱由 `store.config.json` 的 `title` 決定（目前 en-US「Islandia: Collect Taiwan」、zh-Hant「Islandia 小島收藏室」），`metadata:push` 之後就會換掉。要改品牌名就改這兩個欄位再推一次。
- EAS Submit 用的 App Store Connect API Key（`[Expo] EAS Submit`）已綁定，提交不需要再登入 Apple。
- TestFlight Internal 群組「Team (Expo)」已建立，你的 Apple ID 已在裡面。

## 每次建置並上 TestFlight

```bash
npx eas-cli build -p ios --profile production --auto-submit --non-interactive --no-wait
```

- 不需要 TTY，在 Claude Code 的 `!` 裡跑也可以。
- 版本號（buildNumber）由 EAS 遠端自動遞增；改 `app.json` 的 `version` 才會變行銷版本。
- 看進度：`npx eas-cli build:list --platform ios --limit 3`，或 https://expo.dev/accounts/airnoir/projects/islandia/builds
- 建置約 15–25 分鐘，提交後再等 Apple 處理 10–20 分鐘，TestFlight App 就會看到。`app.json` 已設 `usesNonExemptEncryption: false`，不會卡出口合規。
- 建置使用 Xcode 26.6 映像（`expo-widgets` 需要 Xcode 26.4 以上），本機 Xcode 16.2 不夠，所以一律走雲端。

## 曾經失敗的原因（已修）

- **lockfile 不同步**：雲端跑的是 `npm ci`，`package-lock.json` 只要和 `package.json` 不一致就直接失敗。改過 `package.json`（含 `npx expo install …`）之後要讓 lock 跟上並一起 commit；`npm ci --dry-run` 可以在本機先驗。
- **react-dom 版本衝突**：expo-router 的 web 元件把 `react-dom` 當必要 peer，npm 會抓最新版（19.3.0）而和 `react@19.2.3` 衝突。已用 `npx expo install react-dom` 釘在 SDK 57 對應版本。
- `.easignore` 會**取代**`.gitignore` 來決定上傳內容，所以檔案裡先整份複製 `.gitignore`，再加上 `assets/spots/*/reference/`、`docs/` 等 App 用不到的東西。

## 什麼時候才需要 Apple ID 登入

只有要建立新憑證、新 bundle id、或新的 ASC App 時。那時要在**真正的終端機**（Terminal / iTerm）跑，不能用 Claude Code 的 `!`：eas-cli 看到 stdin 不是 TTY 或環境有 `CI=1` 就切成非互動模式，然後在建憑證時失敗（`Distribution Certificate is not validated for non-interactive builds`）。

## 上架文案

```bash
npx eas-cli metadata:push
```

推 `store.config.json`（標題、副標、描述、關鍵字、分類、年齡分級、審核備註）。
`apple.review.email` / `apple.review.phone` 在 repo 裡是佔位值（repo 公開），送審前改成真的再推；TestFlight 內測不需要。截圖不在 metadata 裡，要自己在 ASC 上傳（iPhone 6.9" 與 6.5" 各至少一張）。

## 檢查清單

- [x] 憑證、ASC App、API Key 建好
- [ ] Build 5 成功並出現在 TestFlight
- [ ] 決定最終 App 名稱（「Islandia」不能用）
- [ ] TestFlight 裝到實機，確認：定位打卡、Widget（小／中／鎖定畫面）、走近景點的 Live Activity
- [ ] 審核聯絡資料填好、上傳截圖（送審才需要）
