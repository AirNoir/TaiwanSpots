# Islandia brand concepts

Generated with the built-in image generation tool; exact prompts are stored beside each image.

- `islandia-logo-v1.png`: transparent emblem and wordmark concept.
- `islandia-ios-icon-v2-master.png`: native-resolution cute miniature island icon artwork.
- `islandia-ios-icon-v2-1024.png`: 1024 × 1024 PNG, no alpha channel, opaque cream background, sharp outer image corners; no wordmark at small icon sizes. Downsampled from the native artwork without enlargement.

The square source deliberately has no baked-in rounded icon mask: iOS applies the system mask. The rounded ivory plinth is part of the illustration, not the outer image boundary.

Integrated 2026-10-15: `assets/icon.png` is a byte copy of `islandia-ios-icon-v2-1024.png` (iOS + generic icon). The Android adaptive-icon layers (`assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png`) and `assets/favicon.png` are derived from the master: the foreground places the artwork at ~58 % of the 1024 canvas on the same cream (`#FDF6E1`, also `android.adaptiveIcon.backgroundColor`) so it clears the 66 % safe zone; the monochrome layer is the island silhouette only. This is a flattened default PNG icon, not a layered Icon Composer `.icon` document or a dark/tinted/clear appearance set; iOS 26 applies its Liquid Glass treatment to the flat PNG automatically.

Apple references reviewed 2026-10-15:
- https://developer.apple.com/design/human-interface-guidelines/app-icons/
- https://developer.apple.com/documentation/xcode/configuring-your-app-icon
