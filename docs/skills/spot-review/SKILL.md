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

最新風格採九份背景卡方案（`assets/spots/jiufen/collection/review-v2.png`）；相機與基座以本節文字的新規格覆寫舊圖片。僅參考呈現，不要把該景點的建築、坡向或地標搬到其他景點。

- Q 版微縮收藏模型：輪廓稍圆潤、比例適度壓縮、小人物可愛；不是普通風景照。
- 擬真指環境結構和材質：石材顆粒、風化、石階磨損、屋瓦、玻璃與金屬仍細緻可信；避免手繪筆觸及一律黏土材質。
- 前、中景落在同一塊可見的實體基座，建築有地面連接和接觸陰影。有遠景的背景卡統一使用兩根短象牙色支架與小型黃銅夾具，夾住卡片下緣兩角；支架高約卡片高度 5–7%，固定於同一基座後緣。卡片抬高，未遮擋的下緣、厚度、夾口、奶油色空隙及投影均須可見。模型水面在基座內的象牙色後緣收口，與卡片上的水隔開，不可無縫連成一體。圖卡依真實輪廓繪製；不要把背景當成延伸至基座外的無限風景，也不要用圖卡替代主地標或近處地形。
- 全系列固定相機從前方一角斜上方、45° 向下鳥瞰，能看到基座兩個側面；镜頭拉遠，主体與整個底座完整入鏡，留白 10–15%。
- 基座必須是等邊方形、圓角、淺厚度的象牙色展示底座，不是圓形、橢圓或長方形；透視造成的菱形外觀正常，實際兩邊應等長。奶油背景與柔和自然光。
- 適度移軸式景深形成微縮感，不能用模糊掩蓋錯誤，主地標縮至 512px 仍清楚。
- 坡向、建築輪廓、地標相對位置以該景點照片和 blueprint 為準。植栽只放在有參考支持的位置，不用樹叢填滿都市廣場。
- 不做水晶球或可旋轉 WebGL 建模，除非使用者另行要求。

## 製作與預覽

使用可用的 imagegen 技能及內建生圖工具，標清各輸入是風格、實景或編輯目標。以 `npm run assets:prompt -- <id>` 為場景 brief；舊 prompt 的「不可擬真／省略材質」若與最新指示衝突，採上述最新風格。

1. 只改使用者指定內容，保留其他已接受元素；把 blueprint 的 doNotInvent 加入 prompt。
2. 原生輸出保留為 `collection/review-v<序號>.png`，同名 `-prompt.txt` 保存完整 prompt。不要放大或直接覆蓋舊 master。
3. 自我檢查身份、坡向、輪廓、基座連續、材質、植栽和縮圖辨識。若有明確失敗，針對錯誤修正；遇到反覆失敗時說明局限，不把問題圖稱為定稿。
4. 在 `docs/asset-review-selections.json` 設定該 id 的新預覽檔名，執行 `node scripts/build-asset-comparison.mjs`，開啟 `/docs/asset-comparison.html#<id>`。如果現有瀏覽器記住舊版，重新載入並確認下拉選單選的是新版。顯示新圖與真實照片。
5. blueprint.qa 記錄實際結果和待確認項，不把預覽自動設 approved。來源補入 references，status 可維持 references-collected。

只有使用者要求正式套用 App 資產時，備份舊 master，再將接受版本套用 master，按 art-pipeline 執行 export、registry、assets:check、spots:check、lint、typecheck；地圖 token 是否需重做依輪廓變化與使用者範圍判斷。預覽更新不必重輸出所有景點。不要修改 src/ 程式碼，除產生器更新 spotAssets.generated.ts。commit/push 依本次或既有明確授權執行。

交付簡短列出新圖、比較頁、prompt 與仍待核對的問題。瀏覽器筆記只存在 localStorage，不宣稱已同步到 repo。

- 背景卡夾具固定為一對相同的霧面象牙色短圓柱支架＋緞面黃銅圓角長方形彈簧夾，上下排列的兩個圓形固定點（以淡水 review-v3.png 為夾具造型唯一參考）、可見夾口；不得混用夾具造型。背板垂直於底座、平行底座後緣，上下長邊與對應底座前後邊使用同一透視消失點，不能斜插或滾轉。卡面水的水平線與整體河岸基準線在卡面座標中保持水平，透視方向跟隨卡片長邊；山稜線依實景保留起伏。

底座驗收必須看到四條直邊與四個直角轉折，圓角軟化程度、基座厚度與邊框寬度以淡水 review-v3.png 為共同產品樣板（圓角半徑約邊長 6%，四邊仍以直邊為主）；天然湖岸只能在底座內，不可用湖岸形状當作展示底座外輪廓。對稱斜上方主視角下兩個可見側面應等長；不能只在 prompt 寫 square 就宣稱驗收通過。

基座與背景卡的共用產品樣板改以 assets/spots/tamsui/collection/review-v3.png 為準：同樣的象牙色厚度、邊框、圓角、寬版背景卡比例與夾具尺寸；只替換景點內容。背景卡山海圖維持自然照片感與材質，不新增手繪山稜或裝飾性霧帶。
