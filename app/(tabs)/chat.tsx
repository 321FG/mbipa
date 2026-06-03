/**
 * Chat Screen — cinematic conversation with the Mbipa coach.
 *
 * - Top third: animated portrait hero with sound-wave halo + parallax.
 * - Middle: glassy translucent bubbles with soft colored shadows; bot
 *   messages enter with a spring; user bubbles are a subtle gradient.
 * - Bottom: floating pill input emphasising the microphone.
 */
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Animated,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import {
    ActivityIndicator,
    IconButton,
    Text,
    TextInput,
} from "react-native-paper";
import ReAnimated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CompanionPicker } from "@/src/components/Avatar/CompanionPicker";
import { MbipaPortrait } from "@/src/components/Avatar/MbipaPortrait";
import { RecordingOverlay } from "@/src/components/Chat/RecordingOverlay";
import { useAppDispatch, useAppSelector } from "@/src/hooks";
import {
    cancelRecording,
    onSpeakingChange,
    speak,
    startRecording,
    stopRecordingAndTranscribe,
    stopSpeaking,
} from "@/src/services/speech";
import { analyzeEmotion } from "@/src/services/visionService";
import {
    addMessage,
    clearError,
    createNewConversation,
    fetchConversation,
    sendMessage,
    setTyping,
} from "@/src/store/slices/chatSlice";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";
import { Message } from "@/src/types";
import { stripMarkdown } from "@/src/utils/text";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// Helper: Split assistant messages into separate bubbles by paragraph only
// Keep numbered lists and full paragraphs together for cleaner UI
function splitMessageIntoSentences(content: string): string[] {
  // Only split by double line breaks (paragraph boundaries)
  // This keeps numbered lists, bullet points, and multi-sentence paragraphs together
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // If we got multiple substantial paragraphs, split them
  // Otherwise return the content as-is
  return paragraphs.length > 1 ? paragraphs : [content];
}

// Expand assistant messages with multiple sentences into separate message items
function expandMessages(messages: Message[]): Message[] {
  const expanded: Message[] = [];

  for (const msg of messages) {
    // Only split assistant messages, keep user messages as-is
    if (msg.role === "assistant") {
      const sentences = splitMessageIntoSentences(msg.content);

      // If only 1 sentence/chunk, don't split
      if (sentences.length <= 1) {
        expanded.push(msg);
      } else {
        // Create a separate message for each sentence
        for (let i = 0; i < sentences.length; i++) {
          expanded.push({
            ...msg,
            id: `${msg.id}-${i}`,
            content: sentences[i],
            timestamp: new Date(
              new Date(msg.timestamp).getTime() + i * 100,
            ).toISOString(),
          });
        }
      }
    } else {
      expanded.push(msg);
    }
  }

  return expanded;
}

// ----------------- (moved into ChatScreen) ---------------------------------

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function ChatScreen() {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAutoplay, setVoiceAutoplay] = useState(true);
  const [portraitCompact, setPortraitCompact] = useState(false);
  const [showCompanionPicker, setShowCompanionPicker] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const lastSpokenRef = useRef<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { currentConversation, isLoading, isTyping, isSending, error } =
    useAppSelector((state) => state.chat);
  const { user } = useAppSelector((state) => state.auth);

  const messages = currentConversation?.messages || [];

  useEffect(() => {
    if (!currentConversation) {
      dispatch(createNewConversation());
    }
  }, [currentConversation, dispatch]);

  useEffect(() => {
    if (
      currentConversation?.id &&
      !currentConversation.id.startsWith("temp-")
    ) {
      dispatch(fetchConversation(currentConversation.id));
    }
  }, [currentConversation?.id, dispatch]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isTyping]);

  // Voice gender derived from the user's chosen companion. Bagaza = male,
  // Yassingou (or any unset value) = female. We prefer the explicit
  // `voiceGender` preference so users who customised it keep their pick.
  const character: "bagaza" | "yassingou" =
    user?.preferences?.companion === "bagaza" ? "bagaza" : "yassingou";
  const voiceGender: "male" | "female" =
    user?.preferences?.voiceGender ??
    (character === "bagaza" ? "male" : "female");

  useEffect(() => {
    if (!voiceAutoplay || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const speakable = stripMarkdown(last.content);
    if (!speakable) return;
    const fingerprint = speakable.slice(0, 200);
    if (lastSpokenRef.current === fingerprint) return;
    lastSpokenRef.current = fingerprint;
    const lang =
      (last.lang as "fr" | "en" | "sg") ||
      (i18n.language?.slice(0, 2) as "fr" | "en" | "sg") ||
      "fr";
    speak(speakable, lang, voiceGender, character).catch((e) => {
      console.warn("[chat] auto-speak failed:", e);
      setVoiceAutoplay(false);
      Alert.alert(
        t("chat.voiceUnavailable"),
        e?.message || t("chat.voiceUnavailableMsg"),
      );
    });
  }, [messages, voiceAutoplay, voiceGender, character]);

  useEffect(() => {
    return () => {
      stopSpeaking().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert(t("common.error"), error, [
        { text: "OK", onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (user && !user.preferences?.companion) {
      setShowCompanionPicker(true);
    }
  }, [user]);

  useEffect(() => {
    stopSpeaking().catch(() => {});
    lastSpokenRef.current = null;
  }, [user?.preferences?.companion]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? inputText).trim();
      if (!text || isSending) return;

      const localMessage: Message = {
        id: `local-${Date.now()}`,
        conversationId: currentConversation?.id || "new",
        senderId: user?.id || "me",
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };
      dispatch(addMessage(localMessage));
      setInputText("");
      dispatch(setTyping(true));

      try {
        await dispatch(
          sendMessage({
            conversationId: currentConversation?.id || "new",
            content: text,
          }),
        ).unwrap();
      } catch {
        // surfaced via error effect
      } finally {
        dispatch(setTyping(false));
      }
    },
    [inputText, isSending, currentConversation, user, dispatch],
  );

  const handleVoiceRecord = useCallback(async () => {
    try {
      if (!isRecording) {
        await stopSpeaking();
        const ok = await startRecording();
        if (!ok) {
          Alert.alert(t("chat.micPermission"), t("chat.micPermissionMsg"));
          return;
        }
        setIsRecording(true);
      } else {
        setIsRecording(false);
        const text = await stopRecordingAndTranscribe();
        if (text) {
          await handleSend(text);
        } else {
          Alert.alert(t("chat.audio"), t("chat.noSpeech"));
        }
      }
    } catch (e: any) {
      setIsRecording(false);
      Alert.alert(t("common.error"), e?.message || t("chat.voiceError"));
    }
  }, [isRecording, handleSend]);

  const handleCancelRecording = useCallback(async () => {
    try {
      await cancelRecording();
    } finally {
      setIsRecording(false);
    }
  }, []);

  // Vision check-in: opens the camera for a quick selfie, sends it to the
  // backend (Azure Vision) and drops a gentle assistant reply into the
  // conversation. Optional, dismissible, never surfaces raw scores.
  const handleVisionCheckIn = useCallback(async () => {
    if (isCheckingIn || isSending) return;
    setIsCheckingIn(true); // guard immediately to prevent double-taps
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t("chat.vision.permissionTitle"),
          t("chat.vision.permissionMsg"),
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      dispatch(setTyping(true));
      const lang = (i18n.language?.slice(0, 2) as "fr" | "en" | "sg") || "fr";

      const vision = await analyzeEmotion(result.assets[0].uri, lang);
      console.log("[vision] analyzeEmotion result:", vision);

      const reply: Message = {
        id: `vision-${Date.now()}`,
        conversationId: currentConversation?.id || "new",
        senderId: "mbipa",
        role: "assistant",
        content: vision.message,
        timestamp: new Date().toISOString(),
        lang: vision.lang || lang,
      };
      dispatch(addMessage(reply));
    } catch (e: any) {
      console.warn("[vision] error:", e);
      Alert.alert(
        t("chat.vision.unavailable"),
        e?.message || t("chat.vision.unavailableMsg"),
      );
    } finally {
      dispatch(setTyping(false));
      setIsCheckingIn(false);
    }
  }, [
    isCheckingIn,
    isSending,
    dispatch,
    i18n.language,
    currentConversation?.id,
    t,
  ]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubbleLocal
        message={item}
        isUser={item.role === "user" || item.senderId === user?.id}
        fallbackLang={
          (i18n.language?.slice(0, 2) as "fr" | "en" | "sg") || "fr"
        }
        voiceGender={voiceGender}
        character={character}
      />
    ),
    [user?.id, i18n.language, voiceGender, character],
  );

  // Local MessageBubble so it can use the `styles` object created below
  const MessageBubbleLocal = React.memo(function MessageBubble({
    message,
    isUser,
    fallbackLang,
    voiceGender,
    character,
  }: {
    message: Message;
    isUser: boolean;
    fallbackLang: "fr" | "en" | "sg";
    voiceGender: "male" | "female";
    character?: "bagaza" | "yassingou";
  }) {
    const { t } = useTranslation();
    const cleanedContent = isUser
      ? message.content
      : stripMarkdown(message.content);
    const [speaking, setSpeaking] = useState(false);

    useEffect(() => {
      return onSpeakingChange(setSpeaking);
    }, []);

    const handleSpeak = async () => {
      if (isUser || !cleanedContent) return;
      if (speaking) {
        await stopSpeaking();
        return;
      }
      await stopSpeaking();
      const lang = (message.lang as "fr" | "en" | "sg") || fallbackLang;
      speak(cleanedContent, lang, voiceGender, character).catch((e) => {
        Alert.alert(
          t("chat.voiceUnavailable"),
          e?.message || t("chat.voiceUnavailableMsg"),
        );
      });
    };

    const entering = isUser
      ? FadeInUp.duration(280).springify().damping(18).mass(0.6)
      : FadeInUp.duration(380).springify().damping(13).mass(0.7);

    return (
      <ReAnimated.View
        entering={entering}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.botMessage,
        ]}
      >
        {isUser ? (
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageBubble, styles.userBubble]}
          >
            <Text style={[styles.messageText, styles.userMessageText]}>
              {cleanedContent}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, styles.userMessageTime]}>
                {new Date(message.timestamp).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.messageBubble, styles.botBubble]}>
            <View style={styles.bubbleHighlight} pointerEvents="none" />
            <Text style={styles.messageText}>{cleanedContent}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>
                {new Date(message.timestamp).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <TouchableOpacity
                onPress={handleSpeak}
                style={styles.speakButton}
              >
                <Ionicons
                  name={speaking ? "stop-circle" : "volume-medium"}
                  size={16}
                  color={speaking ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ReAnimated.View>
    );
  });

  // Typing indicator local to use styles
  const TypingIndicatorLocal = () => {
    const breathe = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 0,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }, [breathe]);

    const scale = breathe.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1.08],
    });
    const opacity = breathe.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    });

    return (
      <ReAnimated.View
        entering={ZoomIn.duration(220)}
        style={[styles.messageContainer, styles.botMessage]}
      >
        <View
          style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}
        >
          <View style={styles.bubbleHighlight} pointerEvents="none" />
          <Animated.View
            style={[styles.typingPill, { transform: [{ scale }], opacity }]}
          />
        </View>
      </ReAnimated.View>
    );
  };

  // Recreate styles on each render so they pick up the current `colors` values
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeTop: {
      backgroundColor: "transparent",
    },
    portraitWrap: {
      position: "relative",
    },
    muteBtn: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.xl + spacing.md,
      margin: 0,
    },
    switchBtn: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.xl + spacing.md + 36,
      margin: 0,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: spacing.md,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: fontSizes.xxl,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: spacing.sm,
      fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: spacing.lg,
    },
    suggestionsContainer: {
      alignItems: "center",
    },
    suggestionsTitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    suggestionChip: {
      backgroundColor: colors.primary + "18",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      marginVertical: spacing.xs,
      borderWidth: 1,
      borderColor: colors.primary + "2E",
    },
    suggestionText: {
      color: colors.primary,
      fontSize: fontSizes.sm,
      fontWeight: "600",
    },
    messagesList: {
      padding: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: 110,
    },
    messageContainer: {
      flexDirection: "row",
      marginVertical: spacing.xs,
      alignItems: "flex-end",
    },
    userMessage: {
      justifyContent: "flex-end",
    },
    botMessage: {
      justifyContent: "flex-start",
    },
    messageBubble: {
      maxWidth: "78%",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: 22,
      overflow: "hidden",
    },
    userBubble: {
      borderBottomRightRadius: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 6,
    },
    botBubble: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 4,
    },
    bubbleHighlight: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.surfaceVariant,
    },
    messageText: {
      fontSize: fontSizes.md,
      color: colors.text,
      lineHeight: 22,
    },
    userMessageText: {
      color: colors.textOnPrimary,
    },
    messageFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: spacing.xs,
    },
    messageTime: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
    },
    userMessageTime: {
      color: colors.textOnPrimary + "CC",
    },
    speakButton: {
      marginLeft: spacing.sm,
      padding: spacing.sm + 2,
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    typingBubble: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    typingPill: {
      width: 38,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    inputDock: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: "transparent",
    },
    inputPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 6,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 22,
      elevation: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    micButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 5,
    },
    visionButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "14",
      marginLeft: 4,
    },
    input: {
      flex: 1,
      maxHeight: 100,
      minHeight: 40,
      backgroundColor: "transparent",
      fontSize: fontSizes.md,
      paddingHorizontal: spacing.sm,
      color: colors.text,
    },
    inputContent: {
      color: colors.text,
      fontSize: fontSizes.md,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 2,
    },
    sendButtonDisabled: {
      backgroundColor: colors.primary + "26",
    },
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        {/* Hero portrait — collapses while keyboard is open */}
        <View style={styles.portraitWrap}>
          <MbipaPortrait
            companion={user?.preferences?.companion ?? "yassingou"}
            subtitle={isTyping ? t("chat.typing") : undefined}
            compact={portraitCompact}
            onToggleCompact={() => setPortraitCompact((c) => !c)}
            scrollY={scrollY}
          />
          <IconButton
            icon={voiceAutoplay ? "volume-high" : "volume-off"}
            size={20}
            iconColor={portraitCompact ? colors.textSecondary : "#fff"}
            style={styles.muteBtn}
            accessibilityLabel={
              voiceAutoplay
                ? t("chat.a11y.muteVoice")
                : t("chat.a11y.unmuteVoice")
            }
            onPress={() => {
              setVoiceAutoplay((v) => !v);
              stopSpeaking().catch(() => {});
            }}
          />
          <IconButton
            icon="account-switch"
            size={20}
            iconColor={portraitCompact ? colors.textSecondary : "#fff"}
            style={styles.switchBtn}
            accessibilityLabel={t("chat.a11y.switchCompanion")}
            onPress={() => setShowCompanionPicker(true)}
          />
        </View>
      </SafeAreaView>

      {/* Conversation surface */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {isLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t("chat.loadingMessages")}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t("chat.emptyTitle")}</Text>
            <Text style={styles.emptyText}>{t("chat.emptySubtitle")}</Text>
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>
                {t("chat.suggestions")}
              </Text>
              {[
                t("chat.suggestion1"),
                t("chat.suggestion2"),
                t("chat.suggestion3"),
              ].map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <AnimatedFlatList
            ref={flatListRef as any}
            data={expandMessages(messages)}
            renderItem={renderMessage as any}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isTyping ? <TypingIndicatorLocal /> : null}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
          />
        )}

        {/* Floating pill input */}
        {isRecording ? (
          <RecordingOverlay
            onCancel={handleCancelRecording}
            onStop={handleVoiceRecord}
          />
        ) : (
          <View style={styles.inputDock}>
            <View style={styles.inputPill}>
              <Pressable
                onPress={handleVoiceRecord}
                style={styles.micButton}
                hitSlop={6}
              >
                <LinearGradient
                  colors={["#7C3AED", "#5B8DEF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="mic" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={handleVisionCheckIn}
                disabled={isCheckingIn || isSending}
                style={styles.visionButton}
                hitSlop={6}
                accessibilityLabel={t("chat.vision.button")}
                accessibilityRole="button"
              >
                {isCheckingIn ? (
                  <ActivityIndicator size={16} color={colors.primary} />
                ) : (
                  <Ionicons
                    name="eye-outline"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </Pressable>
              <TextInput
                style={styles.input}
                contentStyle={styles.inputContent}
                textColor={colors.text}
                placeholder={t("chat.placeholder")}
                placeholderTextColor={colors.textLight}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                cursorColor={colors.primary}
                selectionColor={colors.primary}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onSubmitEditing={() => handleSend()}
              />
              <Pressable
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isSending}
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isSending) && styles.sendButtonDisabled,
                ]}
                hitSlop={6}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={
                    inputText.trim() && !isSending ? "#fff" : colors.textLight
                  }
                />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <CompanionPicker
        visible={showCompanionPicker}
        onClose={() => setShowCompanionPicker(false)}
      />
    </View>
  );
}
