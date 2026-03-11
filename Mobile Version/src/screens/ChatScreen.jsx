import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';

function MessageBubble({ msg, isMine, otherAvatar, onReact }) {
  const isSystem = msg.text.startsWith('[DATE_INVITE]') || msg.text.startsWith('[STATUS_DECLARATION]');

  if (isSystem) {
    let label = '';
    let icon = '📅';
    try {
      if (msg.text.startsWith('[DATE_INVITE]')) {
        const d = JSON.parse(msg.text.replace('[DATE_INVITE]', ''));
        label = `Date invite to ${d.place} on ${new Date(d.datetime).toLocaleDateString()}`;
        icon = '📅';
      } else {
        const d = JSON.parse(msg.text.replace('[STATUS_DECLARATION]', ''));
        label = `${d.declaration} declaration — ${d.status}`;
        icon = '💌';
      }
    } catch { label = 'Special message'; }
    return (
      <View style={styles.systemMsg}>
        <Text style={styles.systemMsgText}>{icon} {label}</Text>
      </View>
    );
  }

  // Handle reply format
  let replyPreview = null;
  let displayText = msg.text;
  if (msg.text.includes('[REPLY_START]') && msg.text.includes('[REPLY_END]')) {
    const replyMatch = msg.text.match(/\[REPLY_START\](.*?)\[REPLY_END\]/s);
    if (replyMatch) {
      try {
        const replyData = JSON.parse(replyMatch[1]);
        replyPreview = { sender: replyData.sender, text: replyData.text };
      } catch { }
      displayText = msg.text.replace(/\[REPLY_START\].*?\[REPLY_END\]/s, '').trim();
    }
  }

  const reactions = msg.reactions || {};
  const reactionList = Object.entries(reactions)
    .filter(([, users]) => users.length > 0)
    .map(([emoji, users]) => ({ emoji, count: users.length }));

  return (
    <View style={[styles.bubbleRow, isMine ? styles.rowMine : styles.rowTheirs]}>
      {!isMine && (
        <Image source={{ uri: otherAvatar }} style={styles.msgAvatar} />
      )}
      <TouchableOpacity
        onLongPress={() => onReact(msg.id)}
        activeOpacity={0.85}
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
      >
        {replyPreview && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyLabel}>{replyPreview.sender}</Text>
            <Text style={styles.replyText} numberOfLines={1}>{replyPreview.text}</Text>
          </View>
        )}
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
          {displayText}
        </Text>
        <Text style={styles.bubbleTime}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {reactionList.length > 0 && (
          <View style={styles.reactionsRow}>
            {reactionList.map(r => (
              <Text key={r.emoji} style={styles.reactionChip}>{r.emoji} {r.count}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { chatId } = route.params;
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [threshold, setThreshold] = useState(10);
  const [reactMsgId, setReactMsgId] = useState(null);
  const flatListRef = useRef(null);

  // Quick reactions list
  const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

  useEffect(() => {
    const fetchChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigation.replace('Login'); return; }
      setCurrentUser(session.user);

      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id, status, theme, message_count, created_at,
          user1_id, user2_id,
          user1:profiles!conversations_user1_id_fkey(my_name, profile_image, my_avatar),
          user2:profiles!conversations_user2_id_fkey(my_name, profile_image, my_avatar)
        `)
        .eq('id', chatId)
        .single();

      if (convError) { navigation.goBack(); return; }

      const isUser1 = convData.user1_id === session.user.id;
      const other = isUser1 ? convData.user2 : convData.user1;
      setConversation({
        ...convData,
        other_username: other?.my_name || 'Unknown',
        other_profile_image: other?.profile_image || null,
        other_avatar: other?.my_avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${chatId}`,
      });

      const { data: msgData } = await supabase
        .from('messages')
        .select('id, sender_id, text, created_at, reactions')
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: true });

      setMessages(msgData || []);
      setThreshold(10);
      setLoading(false);
    };
    fetchChat();
  }, [chatId]);

  // Real-time subscription
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel(`mobile_chat_${chatId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${chatId}`
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new]);
          setConversation(prev => prev ? ({
            ...prev,
            message_count: prev.message_count + 1,
            status: prev.message_count + 1 >= threshold ? 'revealed' : prev.status
          }) : prev);
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversations',
        filter: `id=eq.${chatId}`
      }, payload => {
        if (payload.new.status === 'ended') {
          Alert.alert('Match Ended', 'The other person ended this match.');
          navigation.replace('Chats');
          return;
        }
        setConversation(prev => prev ? ({ ...prev, status: payload.new.status, message_count: payload.new.message_count }) : prev);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId, loading, threshold]);

  const handleSend = async () => {
    if (!text.trim() || !currentUser || !conversation) return;
    const msgText = text.trim();
    setText('');
    await supabase.from('messages').insert({
      conversation_id: chatId,
      sender_id: currentUser.id,
      text: msgText
    });
    const newCount = conversation.message_count + 1;
    await supabase.from('conversations').update({
      message_count: newCount,
      status: newCount >= threshold ? 'revealed' : conversation.status
    }).eq('id', chatId);
  };

  const handleReact = async (emoji) => {
    if (!reactMsgId || !currentUser) return;
    const msg = messages.find(m => m.id === reactMsgId);
    if (!msg) return;

    const current = msg.reactions || {};
    let next = { ...current };
    const alreadyHas = current[emoji]?.includes(currentUser.id);

    // Clear previous reactions
    Object.keys(next).forEach(k => {
      next[k] = next[k].filter(uid => uid !== currentUser.id);
      if (next[k].length === 0) delete next[k];
    });

    if (!alreadyHas) {
      next[emoji] = [...(next[emoji] || []), currentUser.id];
    }

    setReactMsgId(null);
    await supabase.from('messages').update({ reactions: next }).eq('id', reactMsgId);
  };

  const isRevealed = conversation?.status === 'revealed';
  const msgCount = conversation?.message_count || 0;
  const revealPct = Math.min(100, Math.round((msgCount / threshold) * 100));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#ec4899" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: isRevealed && conversation.other_profile_image
              ? conversation.other_profile_image
              : conversation.other_avatar
            }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerName}>{conversation.other_username}</Text>
            <Text style={styles.headerSub}>
              {isRevealed ? '✨ Profiles revealed' : `🔒 ${msgCount}/${threshold} messages`}
            </Text>
          </View>
        </View>
      </View>

      {/* Reveal Progress Bar */}
      {!isRevealed && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${revealPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{revealPct}% to reveal</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            isMine={item.sender_id === currentUser?.id}
            otherAvatar={conversation.other_avatar}
            onReact={id => setReactMsgId(id)}
          />
        )}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Reaction Quick-Picker Modal */}
      <Modal transparent visible={!!reactMsgId} onRequestClose={() => setReactMsgId(null)} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setReactMsgId(null)} activeOpacity={1}>
          <View style={styles.reactionPicker}>
            <Text style={styles.reactionPickerTitle}>React with</Text>
            <View style={styles.reactionPickerRow}>
              {QUICK_REACTIONS.map(e => (
                <TouchableOpacity key={e} onPress={() => handleReact(e)} style={styles.reactionPickerBtn}>
                  <Text style={styles.reactionPickerEmoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#4b5563"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#13131f',
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f35',
    gap: 12,
  },
  backBtn: { padding: 4 },
  backBtnText: { color: '#ec4899', fontSize: 20, fontWeight: '600' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2d2d44' },
  headerName: { color: '#f9fafb', fontWeight: '700', fontSize: 15 },
  headerSub: { color: '#6b7280', fontSize: 12 },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: '#13131f',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#2d2d44',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ec4899',
    borderRadius: 2,
  },
  progressLabel: { color: '#9ca3af', fontSize: 12 },
  msgList: { paddingHorizontal: 14, paddingVertical: 12 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6, backgroundColor: '#2d2d44' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: '#ec4899',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#1e1e32',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: '#e5e7eb' },
  bubbleTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  replyBanner: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#fff',
    paddingLeft: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
  replyText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    color: '#fff',
  },
  systemMsg: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsgText: {
    color: '#8b5cf6',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: '#13131f',
    borderTopWidth: 1,
    borderTopColor: '#1f1f35',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e32',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f9fafb',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ec4899',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnText: { color: '#fff', fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2d2d44',
    alignItems: 'center',
  },
  reactionPickerTitle: { color: '#9ca3af', fontSize: 13, marginBottom: 12 },
  reactionPickerRow: { flexDirection: 'row', gap: 10 },
  reactionPickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerEmoji: { fontSize: 26 },
});
