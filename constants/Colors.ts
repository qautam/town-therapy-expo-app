import { Colors as AppColors } from './theme';

const tintColorLight = AppColors.primary;
const tintColorDark = AppColors.white;

export default {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    tint: tintColorLight,
    tabIconDefault: AppColors.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppColors.white,
    background: '#000000',
    tint: tintColorDark,
    tabIconDefault: AppColors.textMuted,
    tabIconSelected: tintColorDark,
  },
};
