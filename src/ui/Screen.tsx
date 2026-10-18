/**
 * Screen scaffold: large left-aligned title that scrolls with the content,
 * floating glass navigation buttons and a soft scroll-edge effect, as in
 * iOS 26 navigation bars.
 */
import React, { createContext, useContext, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BottomTabBarHeightContext } from 'react-native-bottom-tabs';
import { useTheme } from '../theme/ThemeProvider';
import { GUTTER } from '../theme/metrics';
import { T } from './Text';
import { IconButton } from './Button';
import { GlassGroup } from './Glass';

export const BAR_H = 52;

/** Height of the JS tab bar (Android); iOS uses the native measurement. */
export const JsTabInset = createContext<number | undefined>(undefined);

/** Extra space taken by floating bars above the tab bar (workout in progress). */
export const ExtraBottomInset = createContext(0);

export const useTabBarInset = (): number => {
  const native = useContext(BottomTabBarHeightContext);
  const js = useContext(JsTabInset);
  return native ?? js ?? 0;
};

interface Props {
  title: string;
  /** Small line above the large title (date, greeting…). */
  eyebrow?: string;
  /** Show a back button (or pass a custom handler). */
  back?: boolean | (() => void);
  /** Close (xmark) button for modals. */
  close?: boolean | (() => void);
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  /** Floating element pinned to the bottom (primary action). */
  footer?: React.ReactNode;
  /** Extra bottom padding for the content (beyond tab bar / footer). */
  bottomSpace?: number;
  largeTitle?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  scrollRef?: React.RefObject<ScrollView | null>;
  keyboard?: boolean;
  onScroll?: (y: number) => void;
}

export function Screen({
  title,
  eyebrow,
  back,
  close,
  left,
  right,
  children,
  footer,
  bottomSpace = 0,
  largeTitle = true,
  refreshControl,
  scrollRef,
  keyboard,
  onScroll,
}: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const tabInset = useTabBarInset();
  const extraInset = useContext(ExtraBottomInset);
  const y = useRef(new Animated.Value(0)).current;

  const barH = insets.top + BAR_H;
  const edge = y.interpolate({
    inputRange: [0, 16],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const inlineTitle = y.interpolate({
    inputRange: largeTitle ? [36, 60] : [0, 1],
    outputRange: [largeTitle ? 0 : 1, 1],
    extrapolate: 'clamp',
  });

  const goBack = () => {
    if (typeof back === 'function') back();
    else if (typeof close === 'function') close();
    else if (nav.canGoBack()) nav.goBack();
  };

  const leftNode =
    left ??
    (back ? (
      <IconButton
        icon="chevron-left"
        onPress={goBack}
        accessibilityLabel="Indietro"
      />
    ) : close ? (
      <IconButton icon="xmark" onPress={goBack} accessibilityLabel="Chiudi" />
    ) : null);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y } } }],
    {
      useNativeDriver: true,
      listener: onScroll
        ? (e: NativeSyntheticEvent<NativeScrollEvent>) =>
            onScroll(e.nativeEvent.contentOffset.y)
        : undefined,
    },
  );

  const body = (
    <Animated.ScrollView
      ref={scrollRef as any}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={refreshControl}
      contentContainerStyle={{
        paddingTop: barH + (largeTitle ? 0 : 8),
        paddingBottom:
          Math.max(insets.bottom, tabInset) +
          extraInset +
          bottomSpace +
          (footer ? 96 : 24),
        paddingHorizontal: GUTTER,
      }}
      showsVerticalScrollIndicator={false}
    >
      {largeTitle ? (
        <View style={styles.titleBlock}>
          {eyebrow ? (
            <T v="subheadStrong" color="secondary" numberOfLines={1}>
              {eyebrow}
            </T>
          ) : null}
          <T
            v="largeTitle"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            accessibilityRole="header"
          >
            {title}
          </T>
        </View>
      ) : null}
      {children}
    </Animated.ScrollView>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}

      {/* Scroll edge effect + floating navigation items */}
      <View
        pointerEvents="box-none"
        style={[styles.bar, { height: barH + 24 }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: edge }]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.bg} stopOpacity={0.96} />
                <Stop offset="0.62" stopColor={c.bg} stopOpacity={0.8} />
                <Stop offset="1" stopColor={c.bg} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#edge)" />
          </Svg>
        </Animated.View>
        <View
          pointerEvents="box-none"
          style={[styles.barInner, { paddingTop: insets.top, height: barH }]}
        >
          <View style={styles.side}>{leftNode}</View>
          <Animated.View
            pointerEvents="none"
            style={[styles.inlineTitle, { opacity: inlineTitle }]}
          >
            <T v="headline" numberOfLines={1}>
              {title}
            </T>
          </Animated.View>
          <GlassGroup style={[styles.side, styles.sideRight]}>
            {right}
          </GlassGroup>
        </View>
      </View>

      {footer ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.footer,
            {
              paddingBottom:
                Math.max(insets.bottom, 12) +
                (tabInset ? tabInset - insets.bottom : 0),
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleBlock: { paddingTop: 4, paddingBottom: 16 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0 },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
  },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sideRight: { justifyContent: 'flex-end' },
  inlineTitle: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  footer: { position: 'absolute', left: GUTTER, right: GUTTER, bottom: 0 },
});
