import React, { useState, ReactNode } from 'react';
import {
  View, Text, StyleSheet, Image, Modal,
  ScrollView, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  Globe, Pencil, Star, CreditCard, Info, LogOut, ChevronRight, CheckCircle2,
  X, Image as ImageIcon, Camera,
} from 'lucide-react-native';

import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { changeLanguage } from '../../i18n';
import { uploadProfilePicture } from '../../services/storage';
import PressableScale from '../../components/PressableScale';
import { RC, MONO, MONO_MED, RS, HL, RR } from '../../theme/register';

const APP_VERSION = '1.0.0';

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  return <Text style={S.sectionHead}>{title}</Text>;
}

function Row({
  icon, label, right, onPress, isFirst,
}: { icon: ReactNode; label: string; right?: ReactNode; onPress?: () => void; isFirst?: boolean }) {
  return (
    <PressableScale style={[S.row, isFirst && S.rowFirst]} onPress={onPress} disabled={!onPress}>
      <View style={S.rowIcon}>{icon}</View>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={S.rowRight}>
        {right}
        {onPress && !right && <ChevronRight size={16} color={RC.ghost} strokeWidth={1.7} />}
      </View>
    </PressableScale>
  );
}

function RadioRow({
  active, label, icon, onPress, isFirst,
}: { active: boolean; label: string; icon: ReactNode; onPress: () => void; isFirst?: boolean }) {
  return (
    <PressableScale style={[S.row, isFirst && S.rowFirst]} onPress={onPress}>
      <View style={S.rowIcon}>{icon}</View>
      <Text style={[S.rowLabel, active && { color: RC.accent }]}>{label}</Text>
      {active ? (
        <CheckCircle2 size={20} color={RC.accent} strokeWidth={1.8} />
      ) : (
        <View style={S.radioEmpty} />
      )}
    </PressableScale>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const SettingsScreen: React.FC = () => {
  const { t }      = useTranslation();
  const navigation = useNavigation<any>();
  const { user, signOut, updateLanguage, updatePhotoURL } = useAuth();
  const { isSubscribed } = useSubscription(user?.uid || null);

  const [signingOut,      setSigningOut]      = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [avatarMenu,      setAvatarMenu]      = useState(false);
  const [viewerVisible,   setViewerVisible]   = useState(false);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);

  const currentLang = user?.language || 'en';
  const photoURL    = user?.photoURL;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const pickAndUploadPhoto = async () => {
    setAvatarMenu(false);
    if (!user?.uid) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('settings.photoPermission'));
        return;
      }
      await new Promise<void>((r) => setTimeout(r, 300));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
      setUploadingPhoto(true);
      const url = await uploadProfilePicture(result.assets[0].uri, user.uid);
      await updatePhotoURL(url);
    } catch (err: any) {
      Alert.alert(t('common.error'), t('settings.photoError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAvatarPress = () => {
    if (uploadingPhoto) return;
    if (photoURL) setAvatarMenu(true);
    else pickAndUploadPhoto();
  };

  const handleSelectLanguage = async (lang: 'en' | 'de') => {
    if (lang === currentLang || languageLoading) return;
    setLanguageLoading(true);
    try {
      await changeLanguage(lang);
      await updateLanguage(lang);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setLanguageLoading(false);
    }
  };

  const handleEditGoals = () => navigation.navigate('EditGoals', { mode: 'edit' });

  const handleSignOut = () => {
    Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try { await signOut(); }
          catch { Alert.alert(t('common.error'), t('common.error')); }
          finally { setSigningOut(false); }
        },
      },
    ]);
  };

  const handleManageSubscription = () => {
    if (!isSubscribed) {
      navigation.navigate('Paywall');
    } else {
      const url = Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      Linking.openURL(url).catch(() => Alert.alert(t('common.error'), t('common.error')));
    }
  };

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── AKTENKOPF ── */}
        <View style={S.head}>
          <Text style={S.headTitle}>{t('settings.title').toUpperCase()}</Text>
          <Text style={S.headMeta}>v{APP_VERSION}</Text>
        </View>

        <View style={{ height: 26 }} />

        {/* Profil */}
        <View style={S.subSection}>
          <View style={S.profileRow}>
            <PressableScale onPress={handleAvatarPress}>
              <View style={S.avatar}>
                {photoURL ? (
                  <Image source={{ uri: photoURL }} style={S.avatarImg} />
                ) : (
                  <Text style={S.avatarText}>
                    {user?.displayName ? getInitials(user.displayName) : '?'}
                  </Text>
                )}
                <View style={S.avatarBadge}>
                  <Camera size={11} color={RC.onAccent} strokeWidth={2} />
                </View>
              </View>
            </PressableScale>
            <View style={{ flex: 1 }}>
              <Text style={S.profileName}>{user?.displayName || '—'}</Text>
              <Text style={S.profileEmail}>{user?.email || '—'}</Text>
            </View>
            <Text style={[S.tierTxt, { color: isSubscribed ? RC.accent : RC.muted }]}>
              {isSubscribed ? t('settings.tierPremium') : t('settings.tierFree')}
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />

        {/* Sprache */}
        <View style={S.subSection}>
          <SectionHead title={t('settings.language')} />
          <RadioRow
            isFirst
            active={currentLang === 'en'}
            label={t('settings.languageEn')}
            icon={<Globe size={18} color={RC.muted} strokeWidth={1.7} />}
            onPress={() => handleSelectLanguage('en')}
          />
          <RadioRow
            active={currentLang === 'de'}
            label={t('settings.languageDe')}
            icon={<Globe size={18} color={RC.muted} strokeWidth={1.7} />}
            onPress={() => handleSelectLanguage('de')}
          />
        </View>

        <View style={{ height: 30 }} />

        {/* Coaching-Ziele */}
        <View style={S.subSection}>
          <SectionHead title={t('settings.coachingGoals')} />
          <Row
            isFirst
            icon={<Pencil size={18} color={RC.muted} strokeWidth={1.7} />}
            label={t('settings.editGoals')}
            onPress={handleEditGoals}
          />
        </View>

        <View style={{ height: 30 }} />

        {/* Abo */}
        <View style={S.subSection}>
          <SectionHead title={t('settings.subscription')} />
          <Row
            isFirst
            icon={<Star size={18} color={isSubscribed ? RC.accent : RC.faint} strokeWidth={1.7} />}
            label={isSubscribed ? t('settings.subscriptionPremium') : t('settings.subscriptionFree')}
            right={
              <Text style={[S.rowValue, { color: isSubscribed ? RC.accent : RC.faint }]}>
                {isSubscribed ? t('settings.statusActive') : t('settings.statusFree')}
              </Text>
            }
          />
          <Row
            icon={<CreditCard size={18} color={RC.muted} strokeWidth={1.7} />}
            label={t('settings.manageSubscription')}
            onPress={handleManageSubscription}
          />
        </View>

        <View style={{ height: 30 }} />

        {/* Info */}
        <View style={S.subSection}>
          <SectionHead title={t('settings.appVersion')} />
          <Row
            isFirst
            icon={<Info size={18} color={RC.faint} strokeWidth={1.7} />}
            label={t('settings.version', { version: APP_VERSION })}
          />
        </View>

        <View style={{ height: 36 }} />

        {/* Abmelden */}
        <View style={S.subSection}>
          <PressableScale onPress={handleSignOut} disabled={signingOut}>
            <View style={S.signOutBtn}>
              <LogOut size={16} color={RC.text} strokeWidth={1.7} />
              <Text style={S.signOutTxt}>
                {signingOut ? t('common.loading') : t('settings.signOut').toUpperCase()}
              </Text>
            </View>
          </PressableScale>
        </View>

        <View style={{ height: 30 }} />

      </ScrollView>

      {/* ── Avatar-ActionSheet (wenn Bild vorhanden) ── */}
      <Modal
        visible={avatarMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setAvatarMenu(false)}
      >
        <PressableScale style={S.sheetOverlay} onPress={() => setAvatarMenu(false)}>
          <View style={S.sheet}>
            <PressableScale onPress={() => { setAvatarMenu(false); setViewerVisible(true); }}>
              <View style={S.sheetRow}>
                <ImageIcon size={18} color={RC.text} strokeWidth={1.7} />
                <Text style={S.sheetLabel}>{t('settings.photoView')}</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={pickAndUploadPhoto}>
              <View style={[S.sheetRow, S.sheetRowBorder]}>
                <Camera size={18} color={RC.text} strokeWidth={1.7} />
                <Text style={S.sheetLabel}>{t('settings.photoChange')}</Text>
              </View>
            </PressableScale>
          </View>
        </PressableScale>
      </Modal>

      {/* ── Vollbild-Viewer ── */}
      <Modal
        visible={viewerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={S.viewerOverlay}>
          <PressableScale style={S.viewerClose} onPress={() => setViewerVisible(false)}>
            <X size={22} color={RC.onAccent} strokeWidth={2} />
          </PressableScale>
          {photoURL && (
            <Image source={{ uri: photoURL }} style={S.viewerImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: RC.bg },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  // Aktenkopf
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: RS.headTop,
    paddingHorizontal: RS.screenH,
    paddingBottom: RS.headPadB,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },
  headTitle: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 2,
    color: RC.text,
  },
  headMeta: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
    color: RC.muted,
  },

  subSection: {
    paddingHorizontal: RS.screenH,
  },

  // Profil
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: RC.text,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: RC.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RC.bg,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: RC.text,
  },
  profileEmail: {
    fontFamily: MONO,
    fontSize: 12,
    color: RC.faint,
    marginTop: 3,
  },
  tierTxt: {
    fontFamily: MONO_MED,
    fontSize: 11,
    letterSpacing: 1,
  },

  // Section
  sectionHead: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1.5,
    color: RC.faint,
    textTransform: 'uppercase',
    paddingBottom: 9,
    marginBottom: 4,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowIcon: {
    width: 22,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: RC.text,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontFamily: MONO_MED,
    fontSize: 12,
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: RC.ghost,
  },

  // Abmelden
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: RC.lineStrong,
    borderRadius: 15,
    paddingVertical: 15,
  },
  signOutTxt: {
    fontFamily: MONO_MED,
    fontSize: 13,
    letterSpacing: 1.5,
    color: RC.text,
  },

  // Avatar-ActionSheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(33,31,27,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: RC.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: RS.screenH,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
  },
  sheetRowBorder: {
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  sheetLabel: {
    fontSize: 15,
    color: RC.text,
  },

  // Vollbild-Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,18,15,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 22,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  viewerImg: {
    width: '100%',
    height: '70%',
  },
});
