import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.hero}>
        <Text style={styles.title}>Let's <Text style={styles.titleAccent}>Talk</Text></Text>
        <Text style={styles.subtitle}>Sign up to see photos strictly after a great chat.</Text>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Log In</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        {[
          { icon: '💬', title: 'Match First', desc: 'Connect based on what you have to say.' },
          { icon: '📸', title: 'See Later', desc: 'Reveal photos only after a great conversation.' },
          { icon: '🔒', title: 'Secure & Private', desc: 'Your data is protected and kept private.' },
        ].map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 12,
  },
  titleAccent: {
    color: '#ec4899',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#ec4899',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#ec4899',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnSecondary: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#374151',
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#d1d5db',
    fontSize: 17,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  featureIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  featureTitle: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDesc: {
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
