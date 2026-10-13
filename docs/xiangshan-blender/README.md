# 象山六巨石 · Blender 微縮山城

用一支 Blender Python 腳本（`build.py`）程序生成的象山六巨石觀景區微縮模型：
地形板塊、六顆砂岩、沿步道剖面鋪的石階、木欄杆、Q 版登山客、旋轉 28° 的信義區街廓
（人行道、雙黃線、斑馬線、右側通行的車流、路邊機車、行道樹）、台北 101、南山廣場、遠雄金融中心。

- `screenshots/hero.png`：Cycles 主視角（1800²，256 samples，去噪）。`hero-1200.jpg` 是縮圖。
- `screenshots/rocks.jpg`、`screenshots/street.jpg`：岩石特寫、街道車流。
- `index.html` + `xiangshan.glb`：瀏覽器檢視器（three.js 0.160，CDN），岩石與地形貼圖已烘焙，車流在瀏覽器端沿車道移動。
- `build.py`：整個場景的來源，改參數重跑即可。

## 重新產生

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -P docs/xiangshan-blender/build.py -- preview rocks street   # 快速預覽
/Applications/Blender.app/Contents/MacOS/Blender -b -P docs/xiangshan-blender/build.py -- final                  # 正式渲染 + 烘焙 + 匯出 glb
```

輸出在 `build.py` 旁的 `out/`。需要 Blender 5.x；M1 上第一次跑會先編譯 Metal kernel（約 4 分鐘），之後主視角約 1 分鐘。

## 看檢視器

```sh
python3 -m http.server 8893 --bind 127.0.0.1 --directory docs/xiangshan-blender
```

開 http://127.0.0.1:8893/ 。拖曳旋轉、滾輪或雙指縮放，四個預設視角，可關車流。

## 參考

1. Mliu92，View from Xiangshan，CC BY-SA 4.0：https://commons.wikimedia.org/wiki/File:View_from_Xiangshan.jpg
2. UponArriving，步道與岩石近景：https://www.uponarriving.com/elephant-mountain-taipei/
3. 臺北市大地工程處，步道與巨石側面：https://www.geo.gov.taipei/News_Content.aspx?n=23285747C0511EC4&s=40D73EEE2FD289DB&sms=72544237BBE4C5F6

照片僅供觀察比對，沒有嵌入模型。城市距離與比例經壓縮；六石完整配置與背面、一般街廓為藝術推演。
