---
name: spot-review
description: Review and refine Islandia landmark diorama images against real photos, using the approved Xiangshan miniature style, and update the local comparison preview. Use for individual scenery model edits or imported art-review notes.
---

# Islandia 景點模型調整

適用 TaiwanSpots 專案。使用者說 `/spot-review` 或 `$spot-review` 加上景點名稱、id、調整需求時，製作該景點的圖片修訂並更新預覽。範圍預設是使用者指定景點，不自動批次生成所有景點。

## 定位與參考

- 在目前專案找到 `src/data/spots.ts` 的景點 id，讀取 `assets/spots/<id>/blueprint.json`、`reference/sources.json` 與 `docs/art-pipeline.md`。
- 如果使用者正在比較頁，利用網址 hash 定位景點；只有必要時才追問。匯出的 review JSON 包含 model、photo、status、note，將 note 當成使用者審查需求。
- 預覽版本由 `docs/asset-review-selections.json` 決定；正式 App 使用 master/day，不要混淆兩者。
- 觀察目前模型及真實照片；現有照片不足以核對時，上網找另一角度，保留來源、作者、授權與拍攝年代。至少兩個真實角度交叉確認主要地形與建築。生成圖、realistic-study 不是真實證據。
- 使用者要求全系列 Google Maps 重查：每張需記錄街景／360° 與衛星／鳥瞰的實際檢視來源、日期、可確認項及限制；找不到任一類視角須明確標 pending，不能以修改舊模型取代實景核對。支架修圖只屬呈現修訂，不算地理重製完成。
- `verify:` 只有實景或可靠資料確認後才能移除。看不清楚的背面與一般街廓仍須標為推演。

## 最新系列風格（使用者可覆寫）

以 docs/art-pipeline.md 的 2026-10-15 規格為準，使用者最新指示優先。

- 所有景點移除背景板、卡片、支架與夾具；只有真實前、中景落在同一個底座內，遠方不在取景內的山海與天際線省略，底座外為純奶油背景。
- 精緻 Q 版收藏模型，材質與環境擬真，保留辨識結構，不做手繪風、晶球或 WebGL。
- 45° 斜上方鳥瞰、鏡頭無滾轉、完整底座入鏡；真等邊方形、淺象牙色基座，四条長直邊與小圓角。湖岸不能成為底座外框。
- 基座水平、建築直立，建築與平地共用一致透視；真實坡度、彎路與斜向建築平面保留。
- 天然地標與遊客使用一致尺度，女王頭不得誇大；照片不足以測量的尺寸仍標 pending。
- 所有建築、地形、岩石與樹冠占地收在底座內，保留清楚外框與緩衝；超出就縮小整個共同尺度，不截掉地標、不另接後景地形。

## 製作與預覽

使用可用的 imagegen 技能及內建生圖工具，標清各輸入是風格、實景或編輯目標。以 `npm run assets:prompt -- <id>` 為場景 brief；舊 prompt 的「不可擬真／省略材質」若與最新指示衝突，採上述最新風格。

1. 只改使用者指定內容，保留其他已接受元素；把 blueprint 的 doNotInvent 加入 prompt。
2. 原生輸出保留為 `collection/review-v<序號>.png`，同名 `-prompt.txt` 保存完整 prompt。不要放大或直接覆蓋舊 master。
3. 自我檢查身份、坡向、輪廓、基座連續、材質、植栽和縮圖辨識。若有明確失敗，針對錯誤修正；遇到反覆失敗時說明局限，不把問題圖稱為定稿。
4. 在 `docs/asset-review-selections.json` 設定該 id 的新預覽檔名，執行 `node scripts/build-asset-comparison.mjs`，開啟 `/docs/asset-comparison.html#<id>`。如果現有瀏覽器記住舊版，重新載入並確認下拉選單選的是新版。顯示新圖與真實照片。
5. blueprint.qa 記錄實際結果和待確認項，不把預覽自動設 approved。來源補入 references，status 可維持 references-collected。

只有使用者要求正式套用 App 資產時，備份舊 master，再將接受版本套用 master，按 art-pipeline 執行 export、registry、assets:check、spots:check、lint、typecheck；地圖 token 是否需重做依輪廓變化與使用者範圍判斷。預覽更新不必重輸出所有景點。不要修改 src/ 程式碼，除產生器更新 spotAssets.generated.ts。commit/push 依本次或既有明確授權執行。

交付簡短列出新圖、比較頁、prompt 與仍待核對的問題。瀏覽器筆記只存在 localStorage，不宣稱已同步到 repo。
