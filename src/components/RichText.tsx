import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface RichTextProps {
  /** Raw text that may contain markdown-style emphasis: **bold** or *bold*. */
  text: string;
  style?: StyleProp<TextStyle>;
  /** Extra style applied to the bold segments (merged on top of `style`). */
  boldStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Renders a string that may contain markdown bold markers, turning `**text**`
 * (or `*text*`) into actually-bold text WITHOUT showing the asterisks. Gemini
 * frequently emits headings like "**Exercise for body language:**" — this makes
 * them render bold instead of printing literal stars.
 *
 * Anything that isn't wrapped in asterisks is rendered normally. Stray single
 * asterisks that don't form a pair are stripped so they never show literally.
 */
const RichText: React.FC<RichTextProps> = ({ text, style, boldStyle, numberOfLines }) => {
  // Split on **...** or *...* while keeping the delimiters in the result.
  const segments = (text ?? '').split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) => {
        const isBold =
          (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) ||
          (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2);

        if (isBold) {
          const inner = seg.replace(/^\*+/, '').replace(/\*+$/, '');
          return (
            <Text key={i} style={[{ fontWeight: '700' }, boldStyle]}>
              {inner}
            </Text>
          );
        }

        // Strip any leftover stray asterisks from plain segments.
        return seg.replace(/\*/g, '');
      })}
    </Text>
  );
};

export default RichText;
