import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Native Extras, die erst ab Build 5 im Binary sind (expo-haptics, expo-glass-effect).
 *
 * runtimeVersion folgt der App-Version — ein OTA mit diesem Code kann also auch
 * Build 4 erreichen, in dem die nativen Module fehlen. Deshalb wird hier zuerst
 * geprüft, ob das native Modul existiert, und das JS-Paket erst dann (lazy)
 * geladen. Fehlt es: keine Haptik bzw. weiter der bisherige BlurView, kein Absturz.
 */

const HAS_HAPTICS = Platform.OS !== 'web' && !!requireOptionalNativeModule('ExpoHaptics');

/** Leichtes Antippen (impactLight) — Tab-Wechsel, Umschalter, Haupt-Buttons. */
export function hapticLight(): void {
  if (!HAS_HAPTICS) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('expo-haptics');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // ignorieren — Haptik ist reine Zugabe
  }
}

type LiquidGlassModule = { GlassView: React.ComponentType<any> };
let liquidGlass: LiquidGlassModule | null | undefined;

/** expo-glass-effect, wenn das native Modul da ist UND iOS Liquid Glass kann (iOS 26+). */
export function getLiquidGlass(): LiquidGlassModule | null {
  if (liquidGlass !== undefined) return liquidGlass;
  liquidGlass = null;
  if (Platform.OS !== 'ios') return liquidGlass;
  try {
    if (!requireOptionalNativeModule('ExpoGlassEffect')) return liquidGlass;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-glass-effect');
    if (mod?.isLiquidGlassAvailable?.()) liquidGlass = mod as LiquidGlassModule;
  } catch {
    liquidGlass = null;
  }
  return liquidGlass;
}
