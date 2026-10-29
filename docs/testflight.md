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

- 不需要 TTY，在 Claude Code 的 `!` 裡跑也可以。但 `--non-interactive` 不會登入 Apple，所以**不會同步 capability、也不會重做失效的 profile**；`app.json` 動到 entitlement（新 plugin、`usesAppleSignIn`、App Group、Push…）之後的第一次建置，要改用下面「entitlement 有變動時」的跑法。
- 版本號（buildNumber）由 EAS 遠端自動遞增；改 `app.json` 的 `version` 才會變行銷版本。
- 看進度：`npx eas-cli build:list --platform ios --limit 3`，或 https://expo.dev/accounts/airnoir/projects/islandia/builds
- 建置約 15–25 分鐘，提交後再等 Apple 處理 10–20 分鐘，TestFlight App 就會看到。`app.json` 已設 `usesNonExemptEncryption: false`，不會卡出口合規。
- 建置使用 Xcode 26.6 映像（`expo-widgets` 需要 Xcode 26.4 以上），本機 Xcode 16.2 不夠，所以一律走雲端。

## 曾經失敗的原因（已修）

- **lockfile 不同步**：雲端跑的是 `npm ci`，`package-lock.json` 只要和 `package.json` 不一致就直接失敗。改過 `package.json`（含 `npx expo install …`）之後要讓 lock 跟上並一起 commit；`npm ci --dry-run` 可以在本機先驗。
- **react-dom 版本衝突**：expo-router 的 web 元件把 `react-dom` 當必要 peer，npm 會抓最新版（19.3.0）而和 `react@19.2.3` 衝突。已用 `npx expo install react-dom` 釘在 SDK 57 對應版本。
- `.easignore` 會**取代**`.gitignore` 來決定上傳內容，所以檔案裡先整份複製 `.gitignore`，再加上 `assets/spots/*/reference/`、`docs/` 等 App 用不到的東西。
- **封存 1.2 GB（2026-10-29 修）**：eas-cli 打包時先 `git clone --depth 1`，那個 shallow `.git` 帶著 HEAD 裡全部 blob（repo 追蹤了 700 多張 png 母檔），而 `.git` 只有在 `.easignore` 明確列出時才會被刪（Expo 文件：「To exclude the shallow .git directory from the project archive, add .git to .easignore」）。加上 `.git` 後用 `npx eas-cli@latest build:inspect --platform ios --profile production --stage archive --output <dir> --force` 實測封存只剩 44 MB。之後每次 build 上傳快很多；要檢查封存內容就用同一個指令。
- **Provisioning profile 缺 capability（Build 10、11，2026-10-28）**：加了 `expo-apple-authentication`（entitlement `com.apple.developer.applesignin`）之後用 `--non-interactive` 建置，Xcode 報 `Provisioning profile "…" doesn't include the Sign In with Apple capability`。原因：非互動模式下 eas-cli 不登入 Apple，所以不會把新 entitlement 同步成 bundle id 的 capability，也不會發現舊 profile 已不合用，就直接拿 2026-10-14 的 profile 去簽。2026-10-29 的修法：先用 ASC API `POST /v1/bundleIdCapabilities` 在 bundle id `2F3YAWMJCQ` 加上 `APPLE_ID_AUTH`（eas-cli 自己的「Syncing capabilities」會被 Apple 以 `invalid request document … bundleIdCapabilities.data[0].attributes` 拒絕，是 eas-cli 送出的格式問題），Apple 隨即把舊 profile 標成 INVALID；再用下面的跑法建置一次，eas-cli 看到 profile 失效會問 `Would you like to reuse the original profile?`，答 y 就重做 profile（新的是 `WWTNHTS8LS`）。Build 13 是修好後第一個版本。

## entitlement 有變動時：用 ASC API key 跑一次互動建置

```bash
# 用 App Store Connect API key 登入 Apple，不需要 Apple ID 密碼與 2FA
env -u CI \
  EXPO_ASC_API_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8 \
  EXPO_ASC_KEY_ID=<KEY_ID> EXPO_ASC_ISSUER_ID=<ISSUER_ID> \
  EXPO_APPLE_TEAM_ID=B86T5UG392 EXPO_APPLE_TEAM_TYPE=INDIVIDUAL \
  python3 scripts/ptyrun.py /tmp/eas.log /tmp/eas.in -- \
  npx eas-cli@latest build -p ios --profile production --auto-submit --no-wait
```

- 不能加 `--non-interactive`，而且要有 TTY。在真正的終端機直接跑 `npx eas-cli@latest build …` 即可；`scripts/ptyrun.py` 是給 Claude Code 這種沒有 TTY 的環境用的：子程序的輸出寫到 log，要回答提示就 `printf 'y\n' >> /tmp/eas.in`。
- key 要是 team key（有 Issuer ID），角色 Admin 或 App Manager；`.p8` 放 `~/.appstoreconnect/private_keys/`，不進 repo（`.gitignore` 已排除 `*.p8`）。Key ID 與 Issuer ID 在 App Store Connect → Users and Access → Integrations → App Store Connect API。
- 會問的只有 `Would you like to reuse the original profile?`，答 y。
- 如果「Syncing capabilities」被 Apple 拒絕（2026-10-29 發生過），到 https://developer.apple.com/account/resources/identifiers/bundleId/edit/2F3YAWMJCQ 手動勾選 capability（或用 ASC API 加），再重跑一次。
- 之後的建置照常用 `--non-interactive`，直到下一次 entitlement 變動。

## 什麼時候才需要 Apple ID 登入

建立新憑證、新 bundle id、新的 ASC App、同步 capability、重做 profile，這些都能用上面的 ASC API key 環境變數完成。只有 API key 做不到的操作才要在**真正的終端機**（Terminal / iTerm）用 Apple ID 登入，不能用 Claude Code 的 `!`：eas-cli 看到 stdin 不是 TTY 或環境有 `CI=1` 就切成非互動模式，然後在建憑證時失敗（`Distribution Certificate is not validated for non-interactive builds`）。

## 上架文案

```bash
npx eas-cli metadata:push
```

推 `store.config.json`（標題、副標、描述、關鍵字、分類、年齡分級、審核備註）。
`apple.review.email` / `apple.review.phone` 在 repo 裡是佔位值（repo 公開），送審前改成真的再推；TestFlight 內測不需要。截圖不在 metadata 裡，要自己在 ASC 上傳（iPhone 6.9" 與 6.5" 各至少一張）。

## 檢查清單

- [x] 憑證、ASC App、API Key 建好
- [x] Build 5 成功（2026-10-14 17:22）並由 EAS Submit 上傳到 ASC；等 Apple 處理完出現在 TestFlight
- [x] `metadata:push` 已同步（名稱、文案、分類、年齡分級）
- [ ] 決定最終 App 名稱（「Islandia」不能用）
- [ ] TestFlight 裝到實機，確認：定位打卡、Widget（小／中／鎖定畫面）、走近景點的 Live Activity
- [ ] Build 13（2026-10-29 建置成功並由 EAS Submit 上傳，第一個含登入的版本）：實機測 Apple 登入、Google 登入、合併、登出、刪除帳號；要看封存就先在「設定 → App Store → 沙盒帳號」清購買紀錄
- [ ] 審核聯絡資料填好、上傳截圖（送審才需要）
