# Islandia promo video (v1)

`islandia-promo-v1.mp4` is 21 s long, 1080×1920 at 30 fps, and has no audio. It is meant for IG Reels, YouTube Shorts and TikTok. Add music inside each platform's editor.

Built with [Remotion](https://www.remotion.dev). It is self-contained and is not part of the Expo app.

```bash
cd store/marketing/video
npm install
npm run assets   # copies app art into public/ (models, silhouettes, screenshots, icon)
npm run studio   # preview and scrub in the browser
npm run render   # writes islandia-promo-v1.mp4
```

Storyboard (`src/Promo.tsx`, see `T` for frame timings):

| Time | Scene | Caption |
|---|---|---|
| 0–2.7 s | A sealed silhouette wobbles on screen | 這是哪裡？ |
| 2.2–6.5 s | Map zooms to the north coast; a dot walks to the ??? pin while the distance counts down | STEP 1 要走到，才看得到 |
| 6.5–10 s | 留下足跡 button press, flash, and the Jiufen diorama is revealed | STEP 2 留下足跡，模型開箱 |
| 10–15.5 s | Zoom out to all of Taiwan; all 159 spots pop up north → south (130 with art, 29 shown as a sealed ?), terrain blooms green, counter reaches 159 / 159 | STEP 3 收集全台灣 159 座 |
| 15.3–18.5 s | Passport and share-card screenshots in phone frames | STEP 4 每一座，都記得那一天 |
| 18.4–21 s | End card: icon, Islandia, subtitle, App Store CTA | — |

`src/spots.json` lists every spot (id, lng, lat, art) from `src/data/spots.ts`. Regenerate it when spots or art change; `npm run assets` then cuts map tokens into `public/tok/`.

The walking route is a map animation standing in for real footage. When real first-person walking clips exist, they can replace the map close-up in scene 2.
