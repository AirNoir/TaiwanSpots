import { HStack, Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  resizable,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

// Home-screen / lock-screen widget: one collected diorama per day plus progress.
// The layout runs in the widget's isolated runtime — no hooks, no module-scope
// values; everything it shows comes in through props (see ./sync.ts).

export type IslandiaWidgetProps = {
  /** Today's featured spot; empty when nothing is collected yet. */
  spotId: string;
  name: string;
  nameEn: string;
  city: string;
  /** file:// URI of the diorama copied into the shared widgets directory, or ''. */
  image: string;
  collected: number;
  total: number;
  /** Nearest uncollected spot, or '' when everything is collected. */
  nextName: string;
  nextDistance: string;
};

const IslandiaWidget = (p: IslandiaWidgetProps, env: WidgetEnvironment) => {
  'widget';

  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#0B1220' : '#F6F1E7';
  const text = dark ? '#E8ECF2' : '#1E2531';
  const sub = dark ? '#8A93A3' : '#5F6877';
  const accent = dark ? '#F5B14C' : '#B8711A';
  const progress = p.total ? p.collected / p.total : 0;
  const link = p.spotId ? `islandia://spot/${p.spotId}` : 'islandia://';
  const count = `${p.collected} / ${p.total}`;
  // no next stop means either everything is collected or there is no location fix yet
  const next = p.nextName
    ? `下一站 ${p.nextName}・${p.nextDistance}`
    : p.collected >= p.total
      ? '全部收藏完成'
      : '開啟定位，找下一站';

  if (env.widgetFamily === 'accessoryInline') {
    return <Text modifiers={[widgetURL(link)]}>{`Islandia ${count}`}</Text>;
  }

  if (env.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL(link), containerBackground('clear', 'widget')]}>
        <Text modifiers={[font({ size: 13, weight: 'bold' })]}>{`ISLANDIA ${count}`}</Text>
        <ProgressView value={progress} />
        <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>{next}</Text>
      </VStack>
    );
  }

  const diorama = p.image ? (
    <Image uiImage={p.image} modifiers={[resizable(), aspectRatio({ ratio: 1, contentMode: 'fit' })]} />
  ) : (
    <Image systemName="lock.fill" size={34} color={sub} />
  );

  if (env.widgetFamily === 'systemSmall') {
    return (
      <ZStack alignment="bottomLeading" modifiers={[widgetURL(link), containerBackground(bg, 'widget')]}>
        <VStack modifiers={[frame({ maxWidth: 10000, maxHeight: 10000 }), padding({ bottom: 26 })]}>{diorama}</VStack>
        <HStack spacing={4}>
          <Text modifiers={[font({ size: 13, weight: 'heavy' }), foregroundStyle(text), lineLimit(1)]}>
            {p.spotId ? p.name : '還沒有收藏'}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 11, weight: 'bold', design: 'rounded' }), foregroundStyle(accent)]}>{count}</Text>
        </HStack>
      </ZStack>
    );
  }

  // systemMedium
  return (
    <HStack spacing={14} modifiers={[widgetURL(link), containerBackground(bg, 'widget')]}>
      <VStack modifiers={[frame({ width: 132, height: 132 }), clipShape('roundedRectangle', 18)]}>{diorama}</VStack>
      <VStack alignment="leading" spacing={4}>
        <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(accent), lineLimit(1)]}>
          {p.spotId ? p.nameEn : 'MY TAIWAN WORLD'}
        </Text>
        <Text modifiers={[font({ size: 18, weight: 'heavy' }), foregroundStyle(text), lineLimit(1)]}>
          {p.spotId ? p.name : '還沒有收藏'}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(sub), lineLimit(1)]}>
          {p.spotId ? p.city : '到景點留下第一個足跡'}
        </Text>
        <Spacer />
        <HStack>
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(sub)]}>EXPLORED</Text>
          <Spacer />
          <Text modifiers={[font({ size: 13, weight: 'heavy', design: 'rounded' }), foregroundStyle(text)]}>{count}</Text>
        </HStack>
        <ProgressView value={progress} modifiers={[tint(accent)]} />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(sub), lineLimit(1)]}>{next}</Text>
      </VStack>
    </HStack>
  );
};

export default createWidget<IslandiaWidgetProps>('IslandiaWidget', IslandiaWidget);
