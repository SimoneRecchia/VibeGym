/**
 * Screen scaffold: large left-aligned title that scrolls with the content,
 * floating glass navigation buttons and a soft scroll-edge effect, as in
 * iOS 26 navigation bars.
 */
import React, { createContext, useContext, useMemo, useRef } from 'react';
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
import { Backdrop } from './Backdrop';

export const BAR_H = 52;
/** Height of a footer button plus the fade above it. */
const FOOTER_FADE = 96;

// Without a system blur (Android) the edge must hide content almost fully.
const EDGE_TOP = Platform.OS === 'ios' ? 0.96 : 1;
const EDGE_MID = Platform.OS === 'ios' ? 0.8 : 0.92;

/** Height of the JS tab bar (Android); iOS uses the native measurement. */
export const JsTabInset = createContext<number | undefined>(undefined);

/** Extra space taken by floating bars above the tab bar (workout in progress). */
export const ExtraBottomInset = createContext(0);

/**
 * Fade to the background behind floating controls (bottom bars, footers),
 * so content scrolling underneath disappears instead of colliding with them.
 */
export function BottomFade({ height }: { height: number }) {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" style={[styles.fade, { height }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg} stopOpacity={0} />
            <Stop offset="0.45" stopColor={c.bg} stopOpacity={EDGE_MID} />
            <Stop offset="1" stopColor={c.bg} stopOpacity={EDGE_TOP} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomFade)" />
      </Svg>
    </View>
  );
}

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
  /** Color of the ambient glow (default: theme color). */
  tint?: string;
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
  tint,
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
  // The large title fades as it slides under the bar (there is no blur behind
  // the bar on Android, so it would stay readable as a ghost).
  const largeTitleOpacity = y.interpolate({
    inputRange: [0, 44],
    outputRange: [1, 0],
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

  // Created once: re-creating a native-driven event detaches it every render.
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
        useNativeDriver: true,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) =>
          onScrollRef.current?.(e.nativeEvent.contentOffset.y),
      }),
    [y],
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
        <Animated.View
          style={[styles.titleBlock, { opacity: largeTitleOpacity }]}
        >
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
        </Animated.View>
      ) : null}
      {children}
    </Animated.ScrollView>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <Backdrop tint={tint} />
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
                <Stop offset="0" stopColor={c.bg} stopOpacity={EDGE_TOP} />
                <Stop offset="0.62" stopColor={c.bg} stopOpacity={EDGE_MID} />
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
        <BottomFade
          height={
            Math.max(insets.bottom, 12) +
            (tabInset ? tabInset - insets.bottom : 0) +
            extraInset +
            FOOTER_FADE
          }
        />
      ) : null}
      {footer ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.footer,
            {
              // Above the tab bar and any floating bar (workout in progress).
              paddingBottom:
                Math.max(insets.bottom, 12) +
                (tabInset ? tabInset - insets.bottom : 0) +
                extraInset,
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
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
