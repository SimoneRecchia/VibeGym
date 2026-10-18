/**
 * Platform bridge for health data. Placeholder until the native libraries
 * are linked: reports "not available" everywhere.
 */
import { Platform } from 'react-native';
import { HealthDay } from '../nutrition/energy';
import { BodyEntry, Session } from '../core/types';

export const healthPlatformName =
  Platform.OS === 'ios' ? 'Salute' : 'Health Connect';

export type Availability = 'available' | 'needs-install' | 'unsupported';

export const isAvailable = async (): Promise<Availability> => 'unsupported';

export const requestAccess = async (): Promise<boolean> => false;

export const openSettings = async (): Promise<void> => {};

export const readDay = async (_day: string): Promise<HealthDay | null> => null;

export const writeWorkout = async (_s: Session): Promise<void> => {};

export const writeWeight = async (_e: BodyEntry): Promise<void> => {};
