import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  streamCivicAssistant,
  CIVIC_ASSISTANT_NAME,
  CIVIC_ASSISTANT_TITLE,
  CIVIC_STARTER_PROMPTS,
  type CivicChatMessage,
} from '@/lib/civicAssistant';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import { isOpenAIConfigured } from '@/lib/config';

const DR_RANT_AVATAR = require('@/assets/characters/dr-rant.png');

type UiMessage = CivicChatMessage & { id: string; streaming?: boolean };

type AssistantDraft = {
  messages: UiMessage[];
  input: string;
};

const EMPTY_ASSISTANT_DRAFT: AssistantDraft = {
  messages: [],
  input: '',
};

function DrRantAvatar({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={DR_RANT_AVATAR}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.greenLight,
      }}
      contentFit="cover"
      accessibilityLabel={`${CIVIC_ASSISTANT_NAME} portrait`}
    />
  );
}

/** How far to lift the chat so the composer clears the keyboard. */
function liftForKeyboard(event: KeyboardEvent) {
  const height = Math.ceil(event.endCoordinates.height);
  if (Platform.OS !== 'android') return height;

  // When Android already resized the window, padding again would double-lift.
  const screenH = Dimensions.get('screen').height;
  const windowH = Dimensions.get('window').height;
  const resizedBy = screenH - windowH;
  if (resizedBy > height * 0.45) return 0;
  return height;
}

export default function CivicAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const { value: draft, setValue: setDraft, clearDraft } = useTaskDraft(
    'assistant-chat',
    EMPTY_ASSISTANT_DRAFT,
    { pause: loading }
  );
  const { messages, input } = draft;
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const setInput = (value: string) => setDraft((current) => ({ ...current, input: value }));
  const setMessages = (next: UiMessage[] | ((current: UiMessage[]) => UiMessage[])) => {
    setDraft((current) => ({
      ...current,
      messages: typeof next === 'function' ? next(current.messages) : next,
    }));
  };

  const inConversation = messages.length > 0 || loading;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardLift(liftForKeyboard(event));
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, loading, keyboardLift]);

  const returnToQuestions = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setDraft(EMPTY_ASSISTANT_DRAFT);
    void clearDraft();
    setLoading(false);
    Keyboard.dismiss();
  }, [clearDraft, setDraft]);

  const handleBack = useCallback(() => {
    // From a chat reply, land back on the starter questions — don't exit to Profile yet.
    if (inConversation) {
      returnToQuestions();
      return true;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
    return true;
  }, [inConversation, returnToQuestions, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  const sendMessage = async (raw: string) => {
    const content = raw.trim();
    if (!content || loading) return;

    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    const userMessage: UiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    };
    const assistantId = `assistant-${Date.now()}`;

    const nextMessages = [...messages, userMessage];
    setMessages([
      ...nextMessages,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setInput('');
    setLoading(true);

    try {
      const history: CivicChatMessage[] = nextMessages.map(({ role, content: text }) => ({
        role,
        content: text,
      }));

      await streamCivicAssistant(history, {
        signal: abort.signal,
        onToken: (token) => {
          if (requestId !== requestIdRef.current) return;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: `${message.content}${token}`, streaming: true }
                : message
            )
          );
        },
      });

      if (requestId !== requestIdRef.current) return;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: message.content.trim() || 'Hmm — try that again in a moment.',
                streaming: false,
              }
            : message
        )
      );
    } catch (error) {
      if (requestId !== requestIdRef.current || abort.signal.aborted) return;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                streaming: false,
                content:
                  error instanceof Error
                    ? error.message
                    : 'Something went wrong. Try again in a moment.',
              }
            : message
        )
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  };

  const composerBottomPad =
    keyboardLift > 0 ? Spacing.sm : Math.max(insets.bottom, Spacing.sm);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Explicit lift — Android KeyboardAvoidingView often leaves the composer under Gboard */}
      <View style={[styles.flex, { paddingBottom: keyboardLift }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </Pressable>
          <DrRantAvatar size={40} />
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{CIVIC_ASSISTANT_NAME}</Text>
            <Text style={styles.headerSubtitle}>
              {CIVIC_ASSISTANT_TITLE}
              {isOpenAIConfigured ? ' · live chat' : ''}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.chat}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {messages.map((message) => {
            const mine = message.role === 'user';
            const showCursor = Boolean(message.streaming);
            return (
              <View
                key={message.id}
                style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                {!mine ? <DrRantAvatar size={28} /> : null}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {showCursor && !message.content ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : (
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                      {message.content}
                      {showCursor ? '▍' : ''}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {messages.length === 0 && !loading ? (
            <View style={styles.starters}>
              <View style={styles.hero}>
                <DrRantAvatar size={88} />
                <Text style={styles.heroTitle}>{CIVIC_ASSISTANT_NAME}</Text>
                <Text style={styles.heroSubtitle}>
                  {CIVIC_ASSISTANT_TITLE} — chat live about Town Therapy, events, civic duties, and
                  greener habits.
                </Text>
              </View>
              <Text style={styles.startersLabel}>How can I help you today?</Text>
              {CIVIC_STARTER_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={styles.starterChip}
                  onPress={() => sendMessage(prompt)}
                  disabled={loading}>
                  <Text style={styles.starterText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: composerBottomPad }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type your question…"
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            textAlignVertical="top"
            editable={!loading}
            showSoftInputOnFocus
            blurOnSubmit={false}
            returnKeyType="default"
            selectionColor={Colors.primary}
          />
          <Pressable
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}>
            <Ionicons name="send" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chat: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  bubbleMine: {
    backgroundColor: Colors.primaryDark,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  bubbleTextMine: {
    color: Colors.white,
  },
  starters: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    marginTop: Spacing.xs,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
  },
  startersLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: Colors.text,
    marginBottom: 2,
  },
  starterChip: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  starterText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    backgroundColor: Colors.primaryDark,
  },
  input: {
    flex: 1,
    minHeight: 88,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 14 : 12,
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
