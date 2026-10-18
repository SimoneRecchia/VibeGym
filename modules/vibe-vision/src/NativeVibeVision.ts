import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** Analyzes a photo (file:// uri); resolves a JSON string, see index.ts. */
  analyze(uri: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('VibeVision');
