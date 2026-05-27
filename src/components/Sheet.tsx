import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, typography } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  hideHandle?: boolean;
  maxHeightFactor?: number;
}

const SCREEN_H = Dimensions.get('window').height;

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  hideHandle,
  maxHeightFactor = 0.88,
}: Props) {
  const { palette, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.Value(SCREEN_H)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translate, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 4,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, {
          toValue: SCREEN_H,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translate, opacity]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity, backgroundColor: palette.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: mode === 'dark' ? 'rgba(20,20,24,0.96)' : 'rgba(252,252,255,0.97)',
            borderColor: palette.glassBorder,
            paddingBottom: Math.max(insets.bottom + 12, space.lg),
            maxHeight: SCREEN_H * maxHeightFactor,
            transform: [{ translateY: translate }],
          },
        ]}
      >
        {!hideHandle && <View style={[styles.handle, { backgroundColor: palette.dividerStrong }]} />}
        {(title || subtitle) && (
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {title && (
                <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, { color: palette.textDim }]}>{subtitle}</Text>
              )}
            </View>
            <Pressable
              hitSlop={12}
              onPress={onClose}
              style={({ pressed }) => [
                styles.close,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.glassBorder,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Icon name="x" color={palette.text} size={18} />
            </Pressable>
          </View>
        )}
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: space.md,
  },
  title: {
    ...typography.title2,
  },
  subtitle: {
    ...typography.footnote,
    marginTop: 4,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  body: {
    flexShrink: 1,
  },
});
