import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Easing
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ navigation }) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  };

  const handleSearch = async () => {
    setSearching(true);
    setError('');
    startPulse();

    try {
      const { data: conversationId, error: rpcError } = await supabase.rpc('match_user');
      if (rpcError) throw new Error(rpcError.message);

      if (conversationId) {
        navigation.navigate('Chat', { chatId: conversationId });
      } else {
        setError('No matches found right now. Try expanding your preferences.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Let's <Text style={styles.headerAccent}>Talk</Text></Text>
      <Text style={styles.subheader}>Find someone interesting to chat with.</Text>

      {/* Search Button */}
      <View style={styles.center}>
        {searching ? (
          <View style={styles.loaderWrap}>
            <Animated.View style={[styles.heartOuter, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.heartEmoji}>❤️</Text>
            </Animated.View>
            <Text style={styles.searchingText}>Searching for a match...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
            <Text style={styles.searchBtnText}>Start Searching</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Banner */}
      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>❌  {error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 6,
  },
  headerAccent: { color: '#ec4899' },
  subheader: {
    color: '#6b7280',
    fontSize: 15,
    marginBottom: 60,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -80,
  },
  searchBtn: {
    backgroundColor: '#ec4899',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 60,
    shadowColor: '#ec4899',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loaderWrap: {
    alignItems: 'center',
  },
  heartOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ec4899',
  },
  heartEmoji: {
    fontSize: 44,
  },
  searchingText: {
    color: '#9ca3af',
    fontSize: 15,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#2d1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
});
