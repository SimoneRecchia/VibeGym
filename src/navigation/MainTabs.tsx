/**
 * The three sections of the app. Scheda (center) is the landing tab.
 *  - iOS: native SwiftUI TabView → real Liquid Glass tab bar with SF Symbols,
 *    minimizes on scroll and hosts the workout as bottom accessory (iOS 26).
 *  - Android: floating glass capsule drawn in JS.
 */
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabView from 'react-native-bottom-tabs';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../data/store';
import { ProgressTab } from '../screens/ProgressTab';
import { PlanTab } from '../screens/PlanTab';
import { BodyTab } from '../screens/BodyTab';
import { ExtraBottomInset, JsTabInset, useTabBarInset } from '../ui/Screen';
import {
  FLOATING_BAR_H,
  FloatingWorkoutBar,
  NativeWorkoutAccessory,
} from './WorkoutAccessory';
import { Glass } from '../ui/Glass';
import { Tap } from '../ui/Pressable';
import { Icon, IconName } from '../ui/Icon';
import { T } from '../ui/Text';

type TabKey = 'progress' | 'plan' | 'body';

const ROUTES: {
  key: TabKey;
  title: string;
  sf: 'chart.line.uptrend.xyaxis' | 'dumbbell.fill' | 'figure.arms.open';
  icon: IconName;
}[] = [
  {
    key: 'progress',
    title: 'Progressi',
    sf: 'chart.line.uptrend.xyaxis',
    icon: 'chart',
  },
  { key: 'plan', title: 'Scheda', sf: 'dumbbell.fill', icon: 'dumbbell' },
  { key: 'body', title: 'Corpo', sf: 'figure.arms.open', icon: 'figure' },
];

const NATIVE_ACCESSORY =
  Platform.OS === 'ios' && parseFloat(String(Platform.Version)) >= 26;

const renderTab = (key: TabKey) =>
  key === 'progress' ? (
    <ProgressTab />
  ) : key === 'plan' ? (
    <PlanTab />
  ) : (
    <BodyTab />
  );

/** Scene wrapper: adds the floating workout bar where the native accessory isn't available. */
function Scene({ tab }: { tab: TabKey }) {
  const inset = useTabBarInset();
  const active = useStore(s => !!s.workout);
  const floating = active && !NATIVE_ACCESSORY;
  return (
    <ExtraBottomInset.Provider value={floating ? FLOATING_BAR_H + 8 : 0}>
      <View style={styles.fill}>
        {renderTab(tab)}
        {floating ? <FloatingWorkoutBar bottom={inset + 8} /> : null}
      </View>
    </ExtraBottomInset.Provider>
  );
}

function NativeTabs() {
  const { c } = useTheme();
  const [index, setIndex] = useState(1);
  const workout = useStore(s => !!s.workout);
  const routes = ROUTES.map(r => ({
    key: r.key,
    title: r.title,
    focusedIcon: { sfSymbol: r.sf },
  }));
  return (
    <TabView
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={({ route }) => <Scene tab={route.key as TabKey} />}
      tabBarActiveTintColor={c.accent}
      minimizeBehavior="onScrollDown"
      hapticFeedbackEnabled
      renderBottomAccessoryView={
        workout && NATIVE_ACCESSORY
          ? ({ placement }) => <NativeWorkoutAccessory placement={placement} />
          : undefined
      }
    />
  );
}

const JS_BAR_H = 64;

function JsTabs() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(1);
  const [loaded, setLoaded] = useState<TabKey[]>(['plan']);
  const inset = JS_BAR_H + Math.max(insets.bottom, 12) + 8;
  const select = (i: number) => {
    const k = ROUTES[i].key;
    if (!loaded.includes(k)) setLoaded(l => [...l, k]);
    setIndex(i);
  };
  return (
    <JsTabInset.Provider value={inset}>
      <View style={[styles.fill, { backgroundColor: c.bg }]}>
        {ROUTES.map((r, i) =>
          loaded.includes(r.key) ? (
            <View
              key={r.key}
              style={[StyleSheet.absoluteFill, i !== index && styles.hidden]}
              pointerEvents={i === index ? 'auto' : 'none'}
            >
              <Scene tab={r.key} />
            </View>
          ) : null,
        )}
        <View
          pointerEvents="box-none"
          style={[styles.barWrap, { bottom: Math.max(insets.bottom, 12) }]}
        >
          <Glass style={styles.bar}>
            {ROUTES.map((r, i) => {
              const on = i === index;
              return (
                <Tap
                  key={r.key}
                  onPress={() => select(i)}
                  style={styles.item}
                  scaleTo={0.92}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={r.title}
                >
                  <View
                    style={[
                      styles.itemInner,
                      on && { backgroundColor: c.fill3 },
                    ]}
                  >
                    <Icon
                      name={r.icon}
                      size={24}
                      color={on ? c.accent : c.label}
                      weight={on ? 2.3 : 1.9}
                    />
                    <T
                      v="caption2"
                      color={on ? c.accent : c.label}
                      weight="600"
                    >
                      {r.title}
                    </T>
                  </View>
                </Tap>
              );
            })}
          </Glass>
        </View>
      </View>
    </JsTabInset.Provider>
  );
}

export function MainTabs() {
  return Platform.OS === 'ios' ? <NativeTabs /> : <JsTabs />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { opacity: 0 },
  barWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    height: JS_BAR_H,
    borderRadius: JS_BAR_H / 2,
    paddingHorizontal: 6,
    alignItems: 'center',
    width: '86%',
    maxWidth: 420,
  },
  item: { flex: 1 },
  itemInner: {
    height: JS_BAR_H - 12,
    borderRadius: (JS_BAR_H - 12) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
