import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * One place that turns the window into layout numbers, so phones, iPad and iPhone Duo
 * (docs/ipad-support.md) share the same rules:
 *
 * - Read at render time. The window changes size with iPad Split View, Stage Manager and
 *   when iPhone Duo folds; a width read once at import time goes stale.
 * - Text and controls keep their phone sizes. A wider window gets a wider column (up to a
 *   cap) and more grid columns, not bigger type.
 * - Left/right safe-area insets count: on iPhone Duo the bar rail sits on one side.
 */

/** Widest a reading column gets (spot page, lists, settings). */
export const COLUMN_MAX = 680;
/** Widest the home column gets: the map is the point of that page. */
export const HOME_MAX = 760;
/** Widest a grid gets before it stops adding width and centres. */
export const GRID_MAX = 1100;

/** Horizontal size classes, in points. 600 is where iPad mini and the iPhone Duo inner display start. */
export const REGULAR_MIN = 600;

export interface Layout {
  width: number;
  height: number;
  /** Width minus the left and right safe-area insets. */
  usable: number;
  /** Regular width: iPad, the iPhone Duo inner display, wide Split View panes. */
  regular: boolean;
  /** A column of at most `max` points, never wider than the usable width. */
  column: (max?: number) => number;
  /**
   * Side padding that centres a column of `max` inside the usable width (never below `min`).
   * Screens using it apply the left/right safe-area insets themselves (SafeAreaView edges).
   */
  gutter: (max?: number, min?: number) => number;
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const usable = Math.max(0, width - insets.left - insets.right);
  return {
    width,
    height,
    usable,
    regular: width >= REGULAR_MIN,
    column: (max = COLUMN_MAX) => Math.min(usable, max),
    gutter: (max = COLUMN_MAX, min = 0) => Math.max(min, (usable - max) / 2),
  };
}

/**
 * Columns for a grid of square tiles: 3 on phones, then even counts (4, 6) so a grid divides
 * cleanly around the iPhone Duo fold (HIG, "Designing for iPhone Duo").
 */
export function gridColumns(width: number): number {
  if (width < REGULAR_MIN) return 3;
  if (width < 900) return 4;
  return 6;
}

/** Tile size for `cols` columns across `width`, with `gap` between tiles. */
export const tileSize = (width: number, cols: number, gap: number) => Math.floor((width - gap * (cols - 1)) / cols);
