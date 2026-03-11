import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';

const SECTIONS = [
  { icon: '❤️', title: 'Matching & Preferences', desc: 'Set who you want to meet — age, looks, religion, and more.', badge: 'Personalise', screen: 'Preferences' },
  { icon: '👤', title: 'My Profile', desc: 'Edit your name, photos, age, and personal details.', badge: null, screen: 'PersonalInfo' },
  { icon: '🔔', title: 'Notifications', desc: 'Control which push and email alerts you receive.', badge: 'Coming Soon', screen: null },
  { icon: '🛡️', title: 'Privacy & Safety', desc: 'Manage who can see you and how your data is used.', badge: 'Coming Soon', screen: null },
  { icon: '🔒', title: 'Account & Security', desc: 'Change your email, password, and manage your account.', badge: 'Coming Soon', screen: null },
  { icon: '❓', title: 'Help & Support', desc: 'FAQs, contact support, and report a problem.', badge: 'Coming Soon', screen: null },
];

export default function SettingsScreen({ navigation }) {
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          // Auth state change listener in App.js will redirect to Landing
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Settings</Text>
      <Text style={styles.subheader}>Manage your account, preferences and privacy</Text>

      <View style={styles.sectionList}>
        {SECTIONS.map(s => (
          <TouchableOpacity
            key={s.title}
            style={[styles.card, !s.screen && styles.cardDisabled]}
            onPress={() => s.screen && navigation.navigate(s.screen)}
            activeOpacity={s.screen ? 0.75 : 1}
          >
            <Text style={styles.cardIcon}>{s.icon}</Text>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                {s.badge && (
                  <View style={[styles.badge, s.badge === 'Coming Soon' ? styles.badgeSoon : styles.badgeAction]}>
                    <Text style={styles.badgeText}>{s.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardDesc}>{s.desc}</Text>
            </View>
            {!!s.screen && <Text style={styles.chevron}>›</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  header: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f9fafb',
    marginBottom: 4,
  },
  subheader: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 28,
  },
  sectionList: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f1f35',
    gap: 14,
  },
  cardDisabled: { opacity: 0.55 },
  cardIcon: { fontSize: 26 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { color: '#f9fafb', fontWeight: '700', fontSize: 15 },
  cardDesc: { color: '#6b7280', fontSize: 13, lineHeight: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeSoon: { backgroundColor: '#1f2937' },
  badgeAction: { backgroundColor: 'rgba(236,72,153,0.15)' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },
  chevron: { color: '#ec4899', fontSize: 22 },
  logoutBtn: {
    marginTop: 30,
    backgroundColor: '#1a0f0f',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
});
