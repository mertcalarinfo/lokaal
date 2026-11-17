import React, { useMemo, useState, ReactNode } from 'react';
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
import AmbientBackground from '../../components/AmbientBackground';
import Card from '../../components/Card';
import Button from '../../components/Button';
import GlassIconButton from '../../components/GlassIconButton';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

import { useTabBarSpace } from '../../navigation/tabBarSpace';
const APP_VERSION = '1.0.0';

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  return <Text style={S.sectionHead}>{title}</Text>;
}

function Row({
  icon, label, right, onPress, isFirst,
}: { icon: ReactNode; label: string; right?: ReactNode; onPress?: () => void; isFirst?: boolean }) {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  return (
    <PressableScale style={[S.row, isFirst && S.rowFirst]} onPress={onPress} disabled={!onPress}>
      <View style={S.rowIcon}>{icon}</View>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={S.rowRight}>
        {right}
        {onPress && !right && <ChevronRight size={18} color={T.textSecondary} strokeWidth={1.8} />}
      </View>
    </PressableScale>
  );
}

function RadioRow({
  active, label, icon, onPress, isFirst,
}: { active: boolean; label: string; icon: ReactNode; onPress: () => void; isFirst?: boolean }) {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  return (
    <PressableScale style={[S.row, isFirst && S.rowFirst]} onPress={onPress}>
      <View style={S.rowIcon}>{icon}</View>
      <Text style={[S.rowLabel, active && { color: T.accentText }]}>{label}</Text>
      {active ? (
        <CheckCircle2 size={20} color={T.accentText} strokeWidth={1.8} />
      ) : (
        <View style={S.radioEmpty} />
      )}
    </PressableScale>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const SettingsScreen: React.FC = () => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t }      = useTranslation();
  const tabSpace   = useTabBarSpace();
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
    <View style={S.safe}>
      <AmbientBackground animated={false} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={[S.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>

          {/* Kopf */}
          <View style={S.head}>
            <Text style={S.headLabel}>{t('tabs.profile')}</Text>
            <Text style={S.headTitle} accessibilityRole="header">{t('settings.title')}</Text>
          </View>

          {/* Profil */}
          <Card style={S.profileRow}>
            <PressableScale onPress={handleAvatarPress} accessibilityLabel={t('settings.photoChange')}>
              <View style={S.avatar}>
                {photoURL ? (
                  <Image source={{ uri: photoURL }} style={S.avatarImg} />
                ) : (
                  <Text style={S.avatarText}>
                    {user?.displayName ? getInitials(user.displayName) : '?'}
                  </Text>
                )}
                <View style={S.avatarBadge}>
                  <Camera size={11} color={T.onAccent} strokeWidth={2} />
                </View>
              </View>
            </PressableScale>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={S.profileName} numberOfLines={1}>{user?.displayName || '—'}</Text>
              <Text style={S.profileEmail} numberOfLines={1}>{user?.email || '—'}</Text>
            </View>
            <Text style={[S.tierTxt, { color: isSubscribed ? T.accentText : T.textSecondary }]}>
              {isSubscribed ? t('settings.tierPremium') : t('settings.tierFree')}
            </Text>
          </Card>

          {/* Sprache */}
          <View style={S.subSection}>
            <SectionHead title={t('settings.language')} />
            <Card style={S.listCard}>
              <RadioRow
                isFirst
                active={currentLang === 'en'}
                label={t('settings.languageEn')}
                icon={<Globe size={18} color={T.accentText} strokeWidth={1.7} />}
                onPress={() => handleSelectLanguage('en')}
              />
              <RadioRow
                active={currentLang === 'de'}
                label={t('settings.languageDe')}
                icon={<Globe size={18} color={T.accentText} strokeWidth={1.7} />}
                onPress={() => handleSelectLanguage('de')}
              />
            </Card>
          </View>

          {/* Coaching-Ziele */}
          <View style={S.subSection}>
            <SectionHead title={t('settings.coachingGoals')} />
            <Card style={S.listCard}>
              <Row
                isFirst
                icon={<Pencil size={18} color={T.accentText} strokeWidth={1.7} />}
                label={t('settings.editGoals')}
                onPress={handleEditGoals}
              />
            </Card>
          </View>

          {/* Abo */}
          <View style={S.subSection}>
            <SectionHead title={t('settings.subscription')} />
            <Card style={S.listCard}>
              <Row
                isFirst
                icon={<Star size={18} color={isSubscribed ? T.accentText : T.textSecondary} strokeWidth={1.7} />}
                label={isSubscribed ? t('settings.subscriptionPremium') : t('settings.subscriptionFree')}
                right={
                  <Text style={[S.rowValue, { color: isSubscribed ? T.accentText : T.textSecondary }]}>
                    {isSubscribed ? t('settings.statusActive') : t('settings.statusFree')}
                  </Text>
                }
              />
              <Row
                icon={<CreditCard size={18} color={T.accentText} strokeWidth={1.7} />}
                label={t('settings.manageSubscription')}
                onPress={handleManageSubscription}
              />
            </Card>
          </View>

          {/* Info */}
          <View style={S.subSection}>
            <SectionHead title={t('settings.appVersion')} />
            <Card style={S.listCard}>
              <Row
                isFirst
                icon={<Info size={18} color={T.textSecondary} strokeWidth={1.7} />}
                label={t('settings.version', { version: APP_VERSION })}
              />
            </Card>
          </View>

          {/* Abmelden */}
          <Button
            label={signingOut ? t('common.loading') : t('settings.signOut')}
            variant="secondary"
            onPress={handleSignOut}
            disabled={signingOut}
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </SafeAreaView>

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
                <ImageIcon size={18} color={T.text} strokeWidth={1.7} />
                <Text style={S.sheetLabel}>{t('settings.photoView')}</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={pickAndUploadPhoto}>
              <View style={[S.sheetRow, S.sheetRowBorder]}>
                <Camera size={18} color={T.text} strokeWidth={1.7} />
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
          <GlassIconButton icon="close" onPress={() => setViewerVisible(false)} accessibilityLabel={t('common.close')} style={S.viewerClose} />
          {photoURL && (
            <Image source={{ uri: photoURL }} style={S.viewerImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default SettingsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, paddingHorizontal: SP.screen, paddingTop: SP.top, gap: 14 },

  head:      { gap: 4 },
  headLabel: { ...TY.label, color: T.textSecondary },
  headTitle: { ...TY.pageTitle, color: T.text },
  headMeta:  { ...TY.captionSm, color: T.textSecondary },

  subSection:  { gap: 8 },
  sectionHead: { ...TY.label, color: T.textSecondary, paddingHorizontal: 4 },
  listCard:    { paddingHorizontal: 16 },

  // Profil
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: T.accentTint,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg:  { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontFamily: F.semiBold, fontSize: 18, color: T.accentText },
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10,
    backgroundColor: T.accent, borderWidth: 2, borderColor: T.card,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName:  { ...TY.rowTitle, color: T.text },
  profileEmail: { ...TY.caption, color: T.textSecondary },
  tierTxt:      { fontFamily: F.semiBold, fontSize: 12.5 },

  // Zeilen
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: 1, borderTopColor: T.hairline },
  rowFirst:  { borderTopWidth: 0 },
  rowIcon:   { width: 24, alignItems: 'center' },
  rowLabel:  { flex: 1, fontFamily: F.medium, fontSize: 15, color: T.text },
  rowRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:  { fontFamily: F.semiBold, fontSize: 13 },
  radioEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: T.textSecondary },

  // Avatar-Menü
  sheetOverlay: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: SP.screen, paddingBottom: 40 },
  sheet: {
    backgroundColor: T.card, borderRadius: R.card, borderWidth: 1, borderColor: T.cardBorder,
    boxShadow: T.shadowCard, paddingHorizontal: 16,
  },
  sheetRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54 },
  sheetRowBorder: { borderTopWidth: 1, borderTopColor: T.hairline },
  sheetLabel:     { fontFamily: F.medium, fontSize: 15, color: T.text },

  // Vollbild-Viewer
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  viewerClose:   { position: 'absolute', top: 58, right: 24, zIndex: 2 },
  viewerImg:     { width: '100%', height: '78%' },
});
