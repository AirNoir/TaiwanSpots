# 2026-10-19 第二輪審查修訂

依 `2026-10-19-latest.json` 的 8 筆 adjust 製作；其餘 37 筆已接受版本未變。使用內建 imagegen，原生方形 PNG，未放大。全部僅更新比較預覽，沒有覆蓋 master、匯出 App 圖或修改 src。

| 景點 | 新預覽 | 修訂 |
| --- | --- | --- |
| 高美濕地 | `gaomei/collection/review-v4.png` | 拉開濕地範圍，恢復實體風機列；風機間距為藝術壓縮。 |
| 鹿港老街 | `lukang/collection/review-v4.png` | 縮為有限的短街段，減少屋數，不用消失點假裝容納長街。 |
| 七星潭 | `qixingtan/collection/review-v3.png` | 縮小人物與石粒尺度，擴大海面與弧形海岸。 |
| 伯朗大道 | `brown-avenue/collection/review-v4.png` | 縮小道路寬度、人物與樹，保留長道路和大片稻田。 |
| 瑞穗牧場 | `ruisui/collection/review-v3.png` | 縮小牛隻與圍欄，增加開闊草地和分區。 |
| 龍騰斷橋 | `longteng-bridge/collection/review-v4.png` | 調正墩身視覺軸向；保留真實破拱和寬腳座。 |
| 奮起湖 | `fenqihu/collection/review-v4.png` | 軌道、車庫門檻與場坪同平面；移除未核對的列車。 |
| 士林夜市 | `shilin-night-market/collection/review-v6.png` | 道路橫向經過站前，以人行道與廣場隔開入口，恢復紅色劍潭站入口。 |

## 實景與限制

奮起湖補 Jill Chen 2005 年車庫正面照（CC BY 2.0）；龍騰補苗栗縣政府 2017 年新聞的獨立遠景（低解析）。來源與授權記錄在各 reference/sources.json。原始照片保留。

以不同角度／鳥瞰資料核對，再用較弱透視重建模型；沒有足夠相機標定資料，因此不宣稱已精確逆鏡頭校正。龍騰真實地震錯移、奮起湖目前車庫與軌道分岔、士林交通細節仍需地理審核。

高美風機、田野地塊及牧場圍欄有模型取景壓縮，並非測繪精度。新圖自檢不等同使用者驗收，也未把 blueprint 設為 approved。

中間嘗試：龍騰 v3 仍有傾斜感、奮起湖 v3 多出未核對列車、士林 v5 少了真實紅色入口；均保留檔案供追溯，但不設為預設。

完整 prompt 保存於各圖同名 `-prompt.txt`，最新 prompt 同步 `docs/cute-diorama-prompts.json`。現有瀏覽器 localStorage 審查筆記未清除或宣稱已同步。
