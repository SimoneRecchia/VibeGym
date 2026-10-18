/**
 * Inset grouped list, as in the iOS Settings app.
 */
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/metrics';
import { Tap } from './Pressable';
import { Icon, IconName } from './Icon';
import { T } from './Text';
import { haptic } from '../services/haptics';

export function Section({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {title ? (
        <T v="footnote" color="secondary" style={styles.header}>
          {title.toUpperCase()}
        </T>
      ) : null}
      <View style={[styles.group, { backgroundColor: c.card }]}>
        {items.map((child, i) => (
          <View key={i}>
            {child}
            {i < items.length - 1 ? (
              <View style={[styles.sep, { backgroundColor: c.separator }]} />
            ) : null}
          </View>
        ))}
      </View>
      {footer ? (
        <T v="footnote" color="secondary" style={styles.footer}>
          {footer}
        </T>
      ) : null}
    </View>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  /** Background of the rounded icon tile. */
  iconBg?: string;
  onPress?: () => void;
  chevron?: boolean;
  checked?: boolean;
  destructive?: boolean;
  right?: React.ReactNode;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
}

export function Row({
  title,
  subtitle,
  value,
  icon,
  iconBg,
  onPress,
  chevron,
  checked,
  destructive,
  right,
  toggle,
}: RowProps) {
  const { c } = useTheme();
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.tile, { backgroundColor: iconBg ?? c.accent }]}>
          <Icon name={icon} size={18} color="#FFFFFF" weight={2.1} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <T v="body" color={destructive ? 'red' : 'label'} numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T v="footnote" color="secondary" numberOfLines={2}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {value ? (
        <T v="body" color="secondary" numberOfLines={1} style={styles.value}>
          {value}
        </T>
      ) : null}
      {right}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={v => {
            haptic('selection');
            toggle.onChange(v);
          }}
          trackColor={{ true: c.green, false: c.fill }}
          ios_backgroundColor={c.fill}
          thumbColor="#FFFFFF"
        />
      ) : null}
      {checked ? (
        <Icon name="check" size={20} color={c.accent} weight={2.4} />
      ) : null}
      {chevron ? (
        <Icon name="chevron-right" size={16} color={c.tertiary} weight={2.4} />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Tap
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {content}
    </Tap>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  header: { marginLeft: 16, marginBottom: 6 },
  footer: { marginHorizontal: 16, marginTop: 6 },
  group: { borderRadius: radius.card, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0 },
  value: { maxWidth: '45%' },
});
