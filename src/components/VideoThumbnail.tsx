import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  surface: '#0a0f1e',
  surfaceElevated: '#111827',
  primary: '#3B7FE8',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: '#1a2235',
};

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

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  uri,
  thumbnailUri,
  duration,
  onPress,
  onRemove,
  size = 'md',
}) => {
  const [imageError, setImageError] = useState(false);

  const dimensions = {
    sm: { width: 80, height: 60 },
    md: { width: 160, height: 110 },
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
            <Ionicons name="videocam" size={size === 'sm' ? 20 : 32} color={COLORS.primary} />
          </View>
        )}

        {/* Play overlay */}
        {onPress && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Ionicons name="play" size={16} color={COLORS.textPrimary} />
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
          <Ionicons name="close-circle" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 127, 232, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
  },
});

export default VideoThumbnail;
