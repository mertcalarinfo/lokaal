import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Video as VideoIcon, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R } from '../theme';

interface VideoThumbnailProps {
  uri: string;
  thumbnailUri?: string;
  duration?: number;
  onPress?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const createStyles = (T: ThemeColors) => StyleSheet.create({
  container: {
    position:     'relative',
    borderRadius: R.sm,
    overflow:     'hidden',
  },
  touchable: {
    flex: 1,
  },
  thumbnail: {
    width:      '100%',
    height:     '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex:            1,
    backgroundColor: T.surface2,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     T.hairline,
    borderRadius:    R.sm,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: T.accent,
    alignItems:      'center',
    justifyContent:  'center',
  },
  durationBadge: {
    position:          'absolute',
    bottom:            6,
    right:             6,
    backgroundColor:   'rgba(0,0,0,0.7)',
    borderRadius:      R.xs,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  durationText: {
    fontFamily: F.monoMd,
    color:      '#FFFFFF',
    fontSize:   10,
    fontWeight: '600',
  },
  removeButton: {
    position:        'absolute',
    top:             -4,
    right:           -4,
    zIndex:          10,
    backgroundColor: T.error,
    borderRadius:    10,
    width:           20,
    height:          20,
    alignItems:      'center',
    justifyContent:  'center',
  },
});

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  uri,
  thumbnailUri,
  duration,
  onPress,
  onRemove,
  size = 'md',
}) => {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);
  const [imageError, setImageError] = useState(false);

  const dimensions = {
    sm: { width: 80,     height: 60  },
    md: { width: 160,    height: 110 },
    lg: { width: '100%' as any, height: 200 },
  };

  const dim = dimensions[size];

  return (
    <View style={[styles.container, { width: dim.width, height: dim.height }]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
        disabled={!onPress}
      >
        {thumbnailUri && !imageError ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.thumbnail}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <VideoIcon
              size={size === 'sm' ? 20 : 32}
              color={T.textMuted}
              strokeWidth={1.7}
            />
          </View>
        )}

        {/* Play overlay */}
        {onPress && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              {/* Filled play triangle per spec §05 */}
              <VideoIcon size={16} color={T.onAccent} strokeWidth={1.7} />
            </View>
          </View>
        )}

        {/* Duration badge */}
        {duration !== undefined && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Remove button */}
      {onRemove && (
        <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.8}>
          <X size={12} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default VideoThumbnail;
