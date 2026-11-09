# 微縮台灣官網頁面

線上站：https://islandia.littlestep.me

`privacy.html`、`terms.html`、`support.html`、`delete-account.html` 是純靜態檔。Cloudflare Workers 的靜態資源若使用 `html_handling: auto-trailing-slash`（線上 `/privacy` 已是這樣），`delete-account.html` 會對應 **`/delete-account`**。

## 部署

這個 App repo **不是**目前線上站的部署來源。`docs/spec.md` 記載官網 repo 為 `AirNoir/taiwanspots-official-site`（本機通常在 `../taiwanspots-official-site`），用 Cloudflare Workers 發布。只 push 到 `AirNoir/TaiwanSpots` 不會更新 https://islandia.littlestep.me 。

要上線時，把這裡改過的 HTML 蓋到那個官網 repo（不要覆蓋 `assets/spots/` 等既有圖片），在該 repo 執行：

```bash
# Node 22
npx wrangler@latest deploy
```

部署會碰到正式網域，先跟負責人確認再執行。

本機預覽（沒有建置步驟）：

```bash
cd site && python3 -m http.server 8899
```

首頁用到的景點圖與截圖留在原本的官網，這裡只放頁首需要的圖示。
