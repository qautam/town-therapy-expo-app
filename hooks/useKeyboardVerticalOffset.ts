import { Platform } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

/** Stack/modal header height for KeyboardAvoidingView offset on iOS. */
export function useKeyboardVerticalOffset() {
  const headerHeight = useHeaderHeight();
  return Platform.OS === 'ios' ? headerHeight : 0;
}
