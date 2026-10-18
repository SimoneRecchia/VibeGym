/**
 * On-device photo analysis: EAN/UPC barcodes, text lines (labels) and image
 * labels (what the photo shows). Android uses ML Kit models provided by
 * Google Play Services; iOS uses Apple's Vision framework. Nothing leaves
 * the phone.
 */
import NativeVibeVision from './NativeVibeVision';

export interface VisionLine {
  text: string;
  /** Relative height of the line: big text is usually the product name. */
  h: number;
}

export interface VisionResult {
  barcodes: string[];
  lines: VisionLine[];
  /**
   * What the photo shows. `source`: 'vision' (Apple Vision, iOS), 'imagenet'
   * (bundled EfficientNet model, Android), 'base' (ML Kit base labeler).
   */
  labels: {
    name: string;
    confidence: number;
    source?: 'vision' | 'imagenet' | 'base';
  }[];
  /** Per-feature problems, e.g. 'ocr:downloading' while the model installs. */
  errors: string[];
}

export const visionAvailable = NativeVibeVision != null;

export async function analyzeImage(uri: string): Promise<VisionResult> {
  if (!NativeVibeVision) throw new Error('vibe-vision not linked');
  const r = JSON.parse(await NativeVibeVision.analyze(uri));
  return {
    barcodes: Array.isArray(r.barcodes) ? r.barcodes : [],
    lines: Array.isArray(r.lines) ? r.lines : [],
    labels: Array.isArray(r.labels) ? r.labels : [],
    errors: Array.isArray(r.errors) ? r.errors : [],
  };
}
