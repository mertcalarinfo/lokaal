import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

/**
 * Icons aus den v5-HTML-Entwürfen (viewBox 24, runde Enden). Strichstärke wie
 * in der Vorlage: Kacheln 1.7, Chevron 1.8, Haken 2.2, Delta-Pfeil 2.4.
 */
type P = { size?: number; color: string; strokeWidth?: number };

const stroke = (color: string, w: number) => ({
  fill: 'none', stroke: color, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const ChevronRight = ({ size = 18, color, strokeWidth = 1.8 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" {...stroke(color, strokeWidth)} /></Svg>
);

export const ChevronLeft = ({ size = 20, color, strokeWidth = 1.8 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M15 6l-6 6 6 6" {...stroke(color, strokeWidth)} /></Svg>
);

export const UploadIcon = ({ size = 22, color, strokeWidth = 1.7 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 16V4M7 9l5-5 5 5M5 20h14" {...stroke(color, strokeWidth)} /></Svg>
);

export const CameraIcon = ({ size = 22, color, strokeWidth = 1.7 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={3} y={6} width={12} height={12} rx={2.5} {...stroke(color, strokeWidth)} />
    <Path d="M15 10.5l6-3.5v10l-6-3.5" {...stroke(color, strokeWidth)} />
  </Svg>
);

export const CompareIcon = ({ size = 20, color, strokeWidth = 1.7 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={6} cy={6} r={2.5} {...stroke(color, strokeWidth)} />
    <Circle cx={18} cy={18} r={2.5} {...stroke(color, strokeWidth)} />
    <Path d="M6 8.5v5a3 3 0 0 0 3 3h6.5M13 13.5l3 3-3 3M18 15.5v-5a3 3 0 0 0-3-3H8.5" {...stroke(color, strokeWidth)} />
  </Svg>
);

export const CheckIcon = ({ size = 18, color, strokeWidth = 2.2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" {...stroke(color, strokeWidth)} /></Svg>
);

export const CloseIcon = ({ size = 18, color, strokeWidth = 1.8 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" {...stroke(color, strokeWidth)} /></Svg>
);

/** ↗ Verbesserung */
export const TrendUpIcon = ({ size = 13, color, strokeWidth = 2.4 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 17L17 7M9 7h8v8" {...stroke(color, strokeWidth)} /></Svg>
);

/** ↘ Verschlechterung */
export const TrendDownIcon = ({ size = 13, color, strokeWidth = 2.4 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 7l10 10M17 9v8H9" {...stroke(color, strokeWidth)} /></Svg>
);

export const LockIcon = ({ size = 14, color, strokeWidth = 1.8 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={5} y={11} width={14} height={9} rx={2} {...stroke(color, strokeWidth)} />
    <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...stroke(color, strokeWidth)} />
  </Svg>
);
