import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

// Lock Screen / Dynamic Island prompt shown while the user stands inside an
// uncollected spot's check-in radius. Started and ended from ./sync.ts.

export type SpotNearbyProps = {
  spotId: string;
  name: string;
  distance: string;
};

const SpotNearbyActivity = (p: SpotNearbyProps, env: LiveActivityEnvironment) => {
  'widget';

  const accent = env.colorScheme === 'dark' ? '#F5B14C' : '#B8711A';
  const sub = env.colorScheme === 'dark' ? '#8A93A3' : '#5F6877';

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 })]}>
        <Image systemName="mappin.and.ellipse" size={26} color={accent} />
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 16, weight: 'heavy' }), lineLimit(1)]}>{`你在${p.name}的收藏範圍內`}</Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(sub)]}>打開微縮台灣留下足跡</Text>
        </VStack>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'bold', design: 'rounded' }), foregroundStyle(accent)]}>{p.distance}</Text>
      </HStack>
    ),
    compactLeading: <Image systemName="mappin.and.ellipse" color={accent} />,
    compactTrailing: <Text modifiers={[font({ size: 13, weight: 'bold' }), lineLimit(1)]}>{p.name}</Text>,
    minimal: <Image systemName="mappin.and.ellipse" color={accent} />,
    expandedLeading: <Image systemName="mappin.and.ellipse" size={28} color={accent} />,
    expandedCenter: <Text modifiers={[font({ size: 16, weight: 'heavy' }), lineLimit(1)]}>{p.name}</Text>,
    expandedTrailing: <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(accent)]}>{p.distance}</Text>,
    expandedBottom: <Text modifiers={[font({ size: 13 }), foregroundStyle(sub)]}>已進入收藏範圍・點一下打開微縮台灣</Text>,
  };
};

export default createLiveActivity<SpotNearbyProps>('SpotNearbyActivity', SpotNearbyActivity);
