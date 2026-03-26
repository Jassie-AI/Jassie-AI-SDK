import type { Platform } from '../types.js';

export function detectPlatform(): Platform {
  // React Native
  if (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  ) {
    return 'react-native';
  }

  // Node.js
  if (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  ) {
    return 'node';
  }

  // Browser / Web
  return 'web';
}
