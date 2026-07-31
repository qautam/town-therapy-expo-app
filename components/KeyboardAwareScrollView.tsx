import { forwardRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const KEYBOARD_EXTRA_PADDING = 24;

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** iOS stack/modal header offset when KeyboardAvoidingView is enabled. */
  keyboardVerticalOffset?: number;
  /** Disable the outer KeyboardAvoidingView (e.g. when a parent already avoids). */
  avoidKeyboard?: boolean;
};

function mergeContentContainerStyle(
  contentContainerStyle: StyleProp<ViewStyle> | undefined,
  extraBottom: number
): StyleProp<ViewStyle> {
  if (!contentContainerStyle) {
    return { paddingBottom: extraBottom };
  }
  if (Array.isArray(contentContainerStyle)) {
    return [...contentContainerStyle, { paddingBottom: extraBottom }];
  }
  return [contentContainerStyle, { paddingBottom: extraBottom }];
}

export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView(
    {
      children,
      keyboardVerticalOffset = 0,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = 'on-drag',
      automaticallyAdjustKeyboardInsets,
      avoidKeyboard = true,
      contentContainerStyle,
      style,
      ...rest
    },
    ref
  ) {
    const scrollView = (
      <ScrollView
        ref={ref}
        style={[styles.flex, style]}
        contentContainerStyle={mergeContentContainerStyle(
          contentContainerStyle,
          KEYBOARD_EXTRA_PADDING
        )}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        automaticallyAdjustKeyboardInsets={
          automaticallyAdjustKeyboardInsets ?? Platform.OS === 'ios'
        }
        {...rest}>
        {children}
      </ScrollView>
    );

    const useAvoidingView =
      avoidKeyboard && Platform.OS === 'ios' && keyboardVerticalOffset > 0;

    if (!useAvoidingView) {
      return scrollView;
    }

    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}>
        {scrollView}
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
