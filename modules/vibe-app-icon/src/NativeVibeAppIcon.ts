import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** Current icon: iOS alternate icon name / Android alias suffix (null = primary). */
  getIcon(): Promise<string | null>;
  setIcon(name: string | null): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('VibeAppIcon');
