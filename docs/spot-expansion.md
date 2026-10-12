# 景點擴充流程（每日一批）

目標：從 24 個擴充到 159 個景點。清單在 `docs/spot-roadmap.json`，共 9 批、每批 15 個，每批都包含北中南東。
每天做一批；`status: "planned"` 中 `batch` 最小的那一批就是今天要做的。

## 每批步驟

1. **取座標**：每個景點用 OpenStreetMap Nominatim 查（一秒一次，要帶 User-Agent）：

   ```bash
   curl -s -G https://nominatim.openstreetmap.org/search \
     --data-urlencode "q=<景點中文名>" -d format=jsonv2 -d limit=3 -d countrycodes=tw \
     -H "User-Agent: islandia-dev/0.1 (spot geocoding)"
   ```

   - 選真正的景點本體（tourism / historic / leisure / natural），不要選同名的捷運站、公車站、店家。
   - 查不到就換關鍵字（加鄉鎮名、改用正式名稱），或用網路搜尋確認。
   - **不可以憑記憶填座標。** 真的確認不了的景點：照樣加入，但在 PR 說明列出來，並把 roadmap 的 status 設成 `needs-review`。
   - 座標保留小數點後 4 位。

2. **加到 `src/data/spots.ts`**：接在 `ALL_SPOTS` 最後，用 `// ── 擴充 Batch N ──` 註解分隔，格式照 Batch 1。
   - `worldId: 'taiwan'`、`production: 'standard'`、`worldTier: 'regional'`、`active: true`。
   - `checkinRadius`：城市點 250–350、街區/園區 400–500、大範圍自然景點 500–1000、離岸島嶼 1500。
   - `rarity`：城市好到達 `common`；要開車或轉車 `rare`；山區、離島、需預約 `epic`。不要新增 `legendary`。
   - `description`：一句、20–35 字，寫畫面感，標點照現有資料（逗號用半形 `,`）。
   - `art`：procedural fallback（還沒生成圖之前 App 顯示這個）。`icon` / `deco` 必須是存在的 MaterialCommunityIcons 名稱。

3. **建 blueprint**：`assets/spots/<id>/blueprint.json`，`status: "draft"`、`productionTier: "standard"`，必填欄位照 `assets/spots/blueprint.schema.json`。不確定的地理細節寫 `verify: ...`。

4. **更新 roadmap**：這批的 `status` 改成 `added`（確認不了座標的改 `needs-review`）。

5. **檢查**（全部要過）：

   ```bash
   npm run assets:registry
   npm run assets:check      # 新景點只會有 "art pending" 警告，不能有 error
   npm run spots:check       # 座標在台灣範圍內、id 不重複、icon 名稱存在
   npx tsc --noEmit
   npx expo lint
   ```

6. **Commit**：`Add spot batch N (15 spots)`，說明裡列出景點名稱。

## 圖還沒做的景點

新景點只有資料和 blueprint。App 會顯示 procedural diorama、地圖用一般標記，也不能放大檢視。
生圖照 `docs/art-pipeline.md`：`npm run assets:prompt -- <id>` 取 prompt，搭配 MASTER_STYLE_REFERENCE 和參考照片生成，放好圖後把 blueprint 改成 `references-collected`。

## 每日排程（Claude Code routine）

用 Claude Code 的 `/schedule` 建立每天一次的 routine（repo：`AirNoir/TaiwanSpots`），prompt：

> 在 `spots/expansion` 分支工作（不存在就從 `main` 建立；存在就先 merge `origin/main`）。
> 依照 `docs/spot-expansion.md` 新增 `docs/spot-roadmap.json` 裡 `status: "planned"` 且 `batch` 最小的那一批景點。
> 所有檢查通過後 commit 並 push 到 `spots/expansion`；若還沒有從 `spots/expansion` 到 `main` 的 PR 就開一個，已經有就在 PR 留言列出今天新增的景點和需要人工確認的座標。
> 如果 roadmap 已經沒有 planned 的景點，什麼都不做並回報「全部完成」。
