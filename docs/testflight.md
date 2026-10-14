# 上 TestFlight（EAS Build + App Store Connect）

專案已經在 EAS 建好並連結：`@airnoir/islandia`（project id 在 `app.json` 的 `extra.eas.projectId`）。
`eas.json`、`store.config.json`（App Store 上架文案）、`docs/privacy.md` 都已就位。

唯一不能在背景完成的步驟是 **Apple ID 登入（2FA）**，所以下面的指令要由你在終端機跑一次；之後 EAS 會把憑證存在伺服器，以後都可以非互動。

> 一定要在**真正的終端機**（Terminal / iTerm）裡執行，不能用 Claude Code 的 `!` 前綴。
> eas-cli 只要發現 stdin 不是 TTY（或環境有 `CI=1`）就自動切成非互動模式，
> 到建立 Distribution Certificate 時會直接失敗：
> `Distribution Certificate is not validated for non-interactive builds`。
> 失敗的那次仍會把遠端 buildNumber 加一，沒關係，下次會接著往上數。

## 1. 建置並自動上傳 TestFlight

```bash
npx eas-cli build -p ios --profile production --auto-submit
```

互動時會依序問你：

1. **Apple ID 登入**（帳號、密碼、2FA）。
2. 是否要 EAS 幫你建立 bundle id `com.airnoir.islandia` 和 `com.airnoir.islandia.ExpoWidgetsTarget` → **Yes**。
3. 是否產生新的 Distribution Certificate → **Yes**（或選既有的）。
4. 兩個 target 各一個 Provisioning Profile → **Yes**（Widget 需要 App Group `group.com.airnoir.islandia`，EAS 會自動加）。
5. 建置完成後 `--auto-submit` 會接著跑 `eas submit`。如果 App Store Connect 上還沒有這個 App，它會問 **要不要建立** → **Yes**，名稱填 `Islandia`，SKU 用預設。

建置使用 Xcode 26.6 映像（`expo-widgets` 需要 Xcode 26.4 以上）。本機 Xcode 16.2 不夠，所以一律走雲端。

> 帳號的本期 build credits 已用 86%，這次 iOS 建置會再吃一次額度。

## 2. 把上架文案推到 App Store Connect

```bash
npx eas-cli metadata:push
```

會把 `store.config.json` 的標題、副標、描述、關鍵字、分類（旅遊／娛樂）、年齡分級、審核備註推上去。
推之前先改這兩個欄位（目前是佔位值）：

- `apple.review.email`
- `apple.review.phone`

截圖不在 metadata 裡，要自己在 ASC 上傳（iPhone 6.9" 與 6.5" 各至少一張）。TestFlight 內測不需要截圖。

## 3. TestFlight

上傳後約 10–20 分鐘在 ASC → TestFlight 會出現 build。因為 `app.json` 已設 `usesNonExemptEncryption: false`，不會卡「出口合規」問題。
加自己的 Apple ID 到 Internal Testing 群組就能在 TestFlight App 安裝。

## 之後每次更新

```bash
npx eas-cli build -p ios --profile production --auto-submit --non-interactive
```

版本號由 EAS 遠端自動遞增（`appVersionSource: remote`，`autoIncrement: true`）。改 `app.json` 的 `version` 才會變行銷版本。

## 檢查清單

- [ ] `eas build … --auto-submit` 成功，ASC 出現 Islandia
- [ ] `store.config.json` 的審核聯絡資料填好，`metadata:push` 成功
- [ ] TestFlight 裝到實機，確認：定位打卡、Widget（小／中／鎖定畫面）、走近景點的 Live Activity
- [ ] 上傳截圖（送審才需要）
