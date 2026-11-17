import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ViewStyle, StyleProp } from 'react-native';
import Pressable3D from './Pressable3D';
import { Video, ResizeMode } from 'expo-av';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Glass from './Glass';
import { R } from '../theme';

interface VideoThumbnailProps {
  uri: string;
  /** Kantenlänge der quadratischen Vorschau (Home: 56) */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Kleine Video-Vorschau (erster Frame, Radius 12). Antippen öffnet das Video im
 * Vollbild; Schließen über einen runden Glas-Button.
 */
const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ uri, size = 56, style }) => {
  const { T } = useTheme();
  const { t } = useTranslation();
  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <>
      <Pressable3D
        onPress={() => setViewerVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('home.videoReady')}
        style={[{ width: size, height: size, borderRadius: R.tile, overflow: 'hidden', backgroundColor: '#000' }, style]}
      >
        <Video
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isMuted
          positionMillis={1}
        />
        <View style={S.playWrap} pointerEvents="none">
          <View style={[S.play, { backgroundColor: 'rgba(0,0,0,0.38)' }]}>
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path d="M7 4.5v15l13-7.5z" fill="#FFFFFF" />
            </Svg>
          </View>
        </View>
      </Pressable3D>

      <Modal
        visible={viewerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={S.overlay}>
          <Video
            source={{ uri }}
            style={S.fullVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
          />
          <Pressable3D
            onPress={() => setViewerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={S.closeHit}
          >
            <Glass radius={R.buttonSm} shadow="sm" style={S.close}>
              <View pointerEvents="none">
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={T.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </Glass>
          </Pressable3D>
        </View>
      </Modal>
    </>
  );
};

export default VideoThumbnail;

const S = StyleSheet.create({
  playWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', paddingLeft: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeHit: { position: 'absolute', top: 58, right: 24, zIndex: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fullVideo: { width: '100%', height: '78%' },
});
