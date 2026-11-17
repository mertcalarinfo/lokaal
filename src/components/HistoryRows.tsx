import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronRight } from './Icons';
import Card from './Card';
import Button from './Button';
import { AnalysisReport, SavedComparison } from '../types';
import { F, TY } from '../theme';

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

export function score100(s: number): number {
  return Math.round(s * 10);
}

/** "08.11." — mit Jahr ("08.11.25"), wenn nicht aus dem laufenden Jahr. */
export function formatShortDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return sameYear ? `${dd}.${mm}.` : `${dd}.${mm}.${String(date.getFullYear()).slice(-2)}`;
}

/** Neueste zuerst. */
export function sortReports(reports: AnalysisReport[]): AnalysisReport[] {
  return [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Fallback-Nummerierung für unbenannte Analysen — chronologisch (älteste = 1), stabil. */
export function buildUntitledMap(sortedNewestFirst: AnalysisReport[]): Record<string, number> {
  const map: Record<string, number> = {};
  let n = 0;
  [...sortedNewestFirst].reverse().forEach((r) => {
    if (!r.customName) { n += 1; map[r.id] = n; }
  });
  return map;
}

export function comparisonCounts(comp: SavedComparison) {
  const list = comp.result.categoryComparisons;
  return {
    improved: list.filter((c) => c.direction === 'improved').length,
    declined: list.filter((c) => c.direction === 'declined').length,
    same:     list.filter((c) => c.direction === 'same').length,
  };
}

// ─── Zeilen ───────────────────────────────────────────────────────────────────

/** Trenner zwischen Listenzeilen (hairline). */
export const RowDivider: React.FC = () => {
  const { T } = useTheme();
  return <View style={{ height: 1, backgroundColor: T.hairline }} />;
};

interface AnalysisRowProps {
  name: string;
  date: string;
  score: number;
  /** Veränderung zur vorherigen Analyse, null ohne Vorgänger */
  delta: number | null;
  onPress: () => void;
  /** Rechts statt Chevron (z. B. Auswahlkreis) */
  trailing?: React.ReactNode;
}

/** Zeile 50 hoch: Name/Datum links · Δ · Score · Chevron. */
export const AnalysisRow: React.FC<AnalysisRowProps> = ({ name, date, score, delta, onPress, trailing }) => {
  const { T } = useTheme();
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rs.row, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${date}, ${score}`}
    >
      <View style={rs.left}>
        <Text style={[rs.name, { color: T.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[rs.date, { color: T.textSecondary }]}>{date}</Text>
      </View>
      {delta !== null && (
        <Text style={[rs.delta, { color: up ? T.accentText : T.textSecondary }]}>
          {up ? `↑ ${delta}` : down ? `↓ ${Math.abs(delta)}` : '→ 0'}
        </Text>
      )}
      <Text style={[rs.score, { color: T.text }]}>{score}</Text>
      {trailing ?? <ChevronRight color={T.textSecondary} />}
    </Pressable>
  );
};

/** Gespeicherter Vergleich: Name/Datum links, Chips ↑n ↓n →n rechts. */
export const ComparisonListRow: React.FC<{ comp: SavedComparison; onPress: () => void }> = ({ comp, onPress }) => {
  const { T } = useTheme();
  const { improved, declined, same } = comparisonCounts(comp);
  const name = comp.customName || `${comp.video1Label} → ${comp.video2Label}`;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rs.row, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <View style={rs.left}>
        <Text style={[rs.name, { color: T.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[rs.date, { color: T.textSecondary }]}>{formatShortDate(comp.createdAt)}</Text>
      </View>
      <View style={rs.chips}>
        {improved > 0 && <Text style={[rs.delta, { color: T.accentText }]}>↑ {improved}</Text>}
        {declined > 0 && <Text style={[rs.delta, { color: T.textSecondary }]}>↓ {declined}</Text>}
        {same > 0 && <Text style={[rs.delta, { color: T.textSecondary }]}>→ {same}</Text>}
      </View>
      <ChevronRight color={T.textSecondary} />
    </Pressable>
  );
};

// ─── Listen-Karte und leerer Zustand ─────────────────────────────────────────

export const ListCard: React.FC<{
  label: string;
  action?: { text: string; onPress: () => void };
  children: React.ReactNode;
}> = ({ label, action, children }) => {
  const { T } = useTheme();
  return (
    <Card style={rs.listCard}>
      <View style={rs.listHead}>
        <Text style={[TY.label, { color: T.textSecondary }]}>{label}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={12} accessibilityRole="button">
            <Text style={[rs.action, { color: T.accentText }]}>{action.text}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </Card>
  );
};

export const EmptyCard: React.FC<{
  title: string;
  sub: string;
  cta?: { label: string; onPress: () => void };
}> = ({ title, sub, cta }) => {
  const { T } = useTheme();
  return (
    <Card style={rs.empty}>
      <Text style={[TY.rowTitle, { color: T.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[TY.caption, { color: T.textSecondary, textAlign: 'center' }]}>{sub}</Text>
      {cta && <Button label={cta.label} onPress={cta.onPress} fullWidth style={{ marginTop: 10 }} />}
    </Card>
  );
};

const rs = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, height: 50 },
  left:  { flex: 1, minWidth: 0, gap: 1 },
  name:  { fontFamily: F.medium, fontSize: 14, lineHeight: 18 },
  date:  { fontFamily: F.regular, fontSize: 12, lineHeight: 15, fontVariant: ['tabular-nums'] },
  delta: { fontFamily: F.semiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  score: {
    width: 34, textAlign: 'right', fontFamily: F.medium, fontSize: 18,
    letterSpacing: -0.36, fontVariant: ['tabular-nums'],
  },
  chips: { flexDirection: 'row', gap: 10 },
  listCard: { paddingTop: 12, paddingHorizontal: 18, paddingBottom: 2 },
  listHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 },
  action:   { fontFamily: F.semiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  empty:    { padding: 20, gap: 6, alignItems: 'stretch' },
});
