/**
 * Home screen icon color. iOS: alternate icons "AppIcon-<key>" (the primary
 * icon is the default color). Android: one launcher activity-alias
 * ".Icon<Key>" per color, exactly one enabled.
 */
import { Platform } from 'react-native';
import NativeVibeAppIcon from './NativeVibeAppIcon';

export const appIconAvailable = NativeVibeAppIcon != null;

const cap = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);

/** Key of the current icon, or null when unknown. */
export async function getAppIcon(defaultKey: string): Promise<string | null> {
  if (!NativeVibeAppIcon) return null;
  const name = await NativeVibeAppIcon.getIcon();
  if (Platform.OS === 'ios')
    return name ? name.replace(/^AppIcon-/, '') : defaultKey;
  return name ? name.toLowerCase() : defaultKey;
}

export async function setAppIcon(key: string, defaultKey: string) {
  if (!NativeVibeAppIcon) throw new Error('vibe-app-icon not linked');
  await NativeVibeAppIcon.setIcon(
    Platform.OS === 'ios'
      ? key === defaultKey
        ? null
        : `AppIcon-${key}`
      : cap(key),
  );
}
