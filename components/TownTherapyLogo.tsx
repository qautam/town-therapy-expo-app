import { Image, type ImageProps, StyleSheet, View, type ViewStyle } from 'react-native';

const logoSource = require('../assets/images/logo.png');

type Props = {
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageProps['style'];
  withShadow?: boolean;
};

export function TownTherapyLogo({
  size = 72,
  style,
  imageStyle,
  withShadow = false,
}: Props) {
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        withShadow && styles.shadow,
        style,
      ]}>
      <Image
        source={logoSource}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          imageStyle,
        ]}
        accessibilityLabel="Town Therapy logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
