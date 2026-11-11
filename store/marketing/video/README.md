# Islandia promo video (v1)

`islandia-promo-v1.mp4` is 21 s long, 1080×1920 at 30 fps, with music and sound effects, mastered to −14 LUFS. It is meant for IG Reels, YouTube Shorts, TikTok, YouTube and the website. On Reels or TikTok you can mute it and pick in-app music instead.

Built with [Remotion](https://www.remotion.dev). It is self-contained and is not part of the Expo app.

```bash
cd store/marketing/video
npm install
npm run assets   # copies app art into public/ (models, silhouettes, screenshots, icon)
npm run sfx      # synthesises the sound effects into public/sfx/
# music: put the track at public/music.mp3 (see Music below)
npm run studio   # preview and scrub in the browser
npm run render   # renders, normalises loudness, writes islandia-promo-v1.mp4
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

## Music

The track is "Upbeat Ukulele" by Caldena, from Pixabay (file `caldena-upbeat-ukulele-617550.mp3`). It is used from 0 s and its chorus arrives around 10 s, just as the island starts filling.

The Pixabay Content License allows commercial use without attribution, but it does not allow redistributing the file on its own. For that reason the MP3 is not committed: download it again from Pixabay and save it as `public/music.mp3`.

Sound effects (tap, chime, sparkle, pops, whoosh) are synthesised by `make-sfx.py`, so there is nothing to license. Their cue frames are set in `Soundtrack` in `src/Promo.tsx`.
