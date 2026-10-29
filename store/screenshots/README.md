# App Store screenshots

Taken 2026-10-29 from the simulator (Expo Go + Metro, demo passport loaded, Expo Go's floating
tools button turned off with `defaults write host.exp.Exponent EXDevMenuShowFloatingActionButton -bool NO`,
status bar fixed at 9:41 with `simctl status_bar … override`). JPEG, no alpha.

| Folder | App Store Connect slot | Device | Size | |
|---|---|---|---|---|
| `zh-Hant/iphone-6.3` | iPhone with Dynamic Island (medium display) | iPhone 16 Pro | 1206 × 2622 | **required** |
| `zh-Hant/iphone-6.9` | iPhone with Dynamic Island (large display) | iPhone 16 Pro Max | 1320 × 2868 | optional, recommended |

No iPad set: `supportsTablet` is `false`, so the app is iPhone-only and App Store Connect does not
ask for iPad 13" screenshots (they are "required if app runs on iPad"). Turning on iPad support
would need its own layout pass first (the map and spot sheet do not scale well on a 13" screen).

Order: onboarding, world map, spot page, unlock moment, passport, explore, share card.
The ME tab is left out on purpose: it shows the "simulated purchase (testing)" controls.
