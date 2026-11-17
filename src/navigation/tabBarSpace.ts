import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Abstand, den Inhalte unten brauchen, damit nichts hinter der schwebenden,
 * durchscheinenden Tab-Leiste verschwindet: gemessene Leistenhöhe
 * (inkl. Safe Area + 8) plus `extra`. Außerhalb der Tabs (z. B. Modals) nur `extra`.
 */
export function useTabBarSpace(extra = 24): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  return (tabBarHeight ?? 0) + extra;
}
