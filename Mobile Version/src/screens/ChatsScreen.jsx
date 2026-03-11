import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function ChatsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchChats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, status, theme, message_count,
          user1_id, user2_id,
          user1:profiles!conversations_user1_id_fkey(my_name, profile_image, my_avatar),
          user2:profiles!conversations_user2_id_fkey(my_name, profile_image, my_avatar)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(conv => {
          const isUser1 = conv.user1_id === session.user.id;
          const other = isUser1 ? conv.user2 : conv.user1;
          return {
            id: conv.id,
            status: conv.status,
            message_count: conv.message_count,
            other_username: other?.my_name || 'Unknown',
            other_profile_image: other?.profile_image || null,
            other_avatar: other?.my_avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${conv.id}`,
          };
        });
        setConversations(mapped);
      }
      setLoading(false);
    };

    fetchChats();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', { chatId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: item.status === 'revealed' && item.other_profile_image
            ? item.other_profile_image
            : item.other_avatar
          }}
          style={styles.avatar}
        />
        {item.status === 'revealed' && (
          <View style={styles.revealedDot} />
        )}
      </View>

      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.other_username}</Text>
        <Text style={styles.chatSub}>
          {item.status === 'revealed' ? '✨ Profiles revealed!' : '🔒 Mystery chat active'}
        </Text>
      </View>

      <View style={styles.chatRight}>
        <Text style={styles.msgCount}>{item.message_count} msgs</Text>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#ec4899" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Conversations</Text>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyDesc}>Head to Home to start searching for a match!</Text>
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.homeBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 24,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 14,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2d2d44',
  },
  revealedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  chatSub: {
    color: '#6b7280',
    fontSize: 13,
  },
  chatRight: {
    alignItems: 'flex-end',
  },
  msgCount: {
    color: '#4b5563',
    fontSize: 12,
    marginBottom: 4,
  },
  arrow: {
    color: '#ec4899',
    fontSize: 22,
    fontWeight: '300',
  },
  separator: {
    height: 10,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#f9fafb',
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  homeBtn: {
    backgroundColor: '#ec4899',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  homeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
