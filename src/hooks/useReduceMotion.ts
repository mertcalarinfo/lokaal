import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * true, solange iOS/Android "Bewegung reduzieren" aktiv ist (reagiert auf Änderungen).
 * Dann: keine Bewegung, kein Hochzählen — nur Überblenden.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}
