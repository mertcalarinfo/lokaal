import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Play, X } from 'lucide-react-native';
import PressableScale from './PressableScale';
import { RC, MONO_MED, HL } from '../theme/register';

interface VideoThumbnailProps {
  uri: string;
  duration?: number;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ uri, duration, onRemove, size = 'lg' }) => {
  const [viewerVisible, setViewerVisible] = useState(false);

  const boxHeight = size === 'sm' ? 80 : size === 'md' ? 130 : 200;

  return (
    <View>
      <PressableScale onPress={() => setViewerVisible(true)}>
        <View style={[S.box, { height: boxHeight }]}>
          {/* Erster Frame als statische Vorschau (expo-av, pausiert) */}
          <Video
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted
            positionMillis={1}
          />

          {/* Play-Badge */}
          <View style={S.playBadge}>
            <Play size={20} color={RC.onAccent} strokeWidth={2} fill={RC.onAccent} />
          </View>

          {/* Dauer */}
          {duration !== undefined && (
            <View style={S.durationBadge}>
              <Text style={S.durationTxt}>{formatDuration(duration)}</Text>
            </View>
          )}
        </View>
      </PressableScale>

      {/* Entfernen */}
      {onRemove && (
        <PressableScale style={S.removeBtn} onPress={onRemove}>
          <X size={13} color={RC.onAccent} strokeWidth={2.5} />
        </PressableScale>
      )}

      {/* Vollbild-Viewer */}
      <Modal
        visible={viewerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={S.overlay}>
          <PressableScale style={S.close} onPress={() => setViewerVisible(false)}>
            <X size={22} color={RC.onAccent} strokeWidth={2} />
          </PressableScale>
          <Video
            source={{ uri }}
            style={S.fullVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
          />
        </View>
      </Modal>
    </View>
  );
};

export default VideoThumbnail;

const S = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: '#000',
    borderWidth: HL.std,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: RC.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(20,18,15,0.78)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationTxt: {
    fontFamily: MONO_MED,
    color: '#FFFFFF',
    fontSize: 10,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: RC.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,18,15,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    top: 56,
    right: 22,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  fullVideo: {
    width: '100%',
    height: '78%',
  },
});
