/**
 * Bottom sheet. Partial-height sheets in iOS 26 float inset from the screen
 * edges on a glass material, with corners concentric to the display.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Glass, NATIVE_GLASS } from './Glass';
import { T } from './Text';
import { IconButton } from './Button';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Right header action (e.g. a confirm button). */
  action?: React.ReactNode;
  scroll?: boolean;
  /** Max height as a fraction of the screen. */
  maxHeight?: number;
}

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  action,
  scroll,
  maxHeight = 0.88,
}: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const H = Dimensions.get('window').height;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.setValue(0);
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 3,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, mounted, progress, drag]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 1.1) onClose();
        else
          Animated.spring(drag, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
          }).start();
      },
    }),
  ).current;

  if (!mounted) return null;

  const translateY = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [H, 0] }),
    drag,
  );
  const Content = scroll ? ScrollView : View;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: c.scrim, opacity: progress },
          ]}
        >
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityLabel="Chiudi"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.panelWrap,
            {
              paddingBottom: Math.max(insets.bottom, 8),
              maxHeight: H * maxHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          <Glass
            flat
            style={[styles.panel, !NATIVE_GLASS && { backgroundColor: c.card }]}
          >
            <View {...pan.panHandlers}>
              <View style={[styles.grabber, { backgroundColor: c.tertiary }]} />
              {title || action ? (
                <View style={styles.header}>
                  <IconButton
                    icon="xmark"
                    onPress={onClose}
                    size={36}
                    accessibilityLabel="Chiudi"
                  />
                  <View style={styles.headerText}>
                    {title ? (
                      <T v="headline" align="center" numberOfLines={1}>
                        {title}
                      </T>
                    ) : null}
                    {subtitle ? (
                      <T
                        v="footnote"
                        color="secondary"
                        align="center"
                        numberOfLines={1}
                      >
                        {subtitle}
                      </T>
                    ) : null}
                  </View>
                  <View style={styles.headerSide}>{action}</View>
                </View>
              ) : null}
            </View>
            <Content
              style={scroll ? styles.scroll : undefined}
              contentContainerStyle={scroll ? styles.content : undefined}
              keyboardShouldPersistTaps="handled"
            >
              {scroll ? (
                children
              ) : (
                <View style={styles.content}>{children}</View>
              )}
            </Content>
          </Glass>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panelWrap: { position: 'absolute', left: 8, right: 8, bottom: 0 },
  panel: { borderRadius: 38, overflow: 'hidden' },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 8,
  },
  headerText: { flex: 1 },
  headerSide: { minWidth: 36, alignItems: 'flex-end' },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
});
