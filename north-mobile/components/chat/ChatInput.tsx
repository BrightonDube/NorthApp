/**
 * ChatInput Component
 * 
 * Input bar with attachment button, send button, haptic feedback, and focus indicators.
 * Supports file/image attachments and Enter key to send.
 * 
 * Validates: Requirements 10.3, 11.3, 11.4, 23.7
 */

import { useState, useCallback } from 'react';
import { View, TextInput, Pressable, Platform, StyleSheet, Keyboard, Image, Text, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useIsOnline } from '@/stores/networkStore';
import { useIsDark, useThemeColors } from '@/contexts/ThemeContext';

export interface FileAttachment {
  uri: string;
  name: string;
  type: 'image' | 'document';
  mimeType: string;
  base64?: string;
  size?: number;
}

export interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const isOnline = useIsOnline();
  const isDark = useIsDark();

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || disabled || !isOnline) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(trimmedMessage || '(attachment)', attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);

    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, [message, attachments, disabled, isOnline, onSend]);

  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
  }, []);

  const handleSubmitEditing = useCallback(() => {
    Keyboard.dismiss();
    handleSend();
  }, [handleSend]);

  const pickImage = useCallback(async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachments(prev => [...prev, {
        uri: asset.uri,
        name: asset.fileName || 'image.jpg',
        type: 'image',
        mimeType: asset.mimeType || 'image/jpeg',
        base64: asset.base64 || undefined,
        size: asset.fileSize,
      }]);
    }
  }, []);

  const pickDocument = useCallback(async () => {
    setShowAttachMenu(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv',
             'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      let base64: string | undefined;
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // If base64 read fails, send without it
      }

      setAttachments(prev => [...prev, {
        uri: asset.uri,
        name: asset.name,
        type: 'document',
        mimeType: asset.mimeType || 'application/octet-stream',
        base64,
        size: asset.size,
      }]);
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAttachPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAttachMenu(prev => !prev);
  }, []);

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !disabled && isOnline;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentRow}>
          {attachments.map((att, i) => (
            <View key={i} style={[styles.attachmentPreview, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
              {att.type === 'image' ? (
                <Image source={{ uri: att.uri }} style={styles.attachmentThumb} />
              ) : (
                <Ionicons name="document-text-outline" size={20} color={isDark ? '#A8A29E' : '#78716C'} />
              )}
              <Text numberOfLines={1} style={[styles.attachmentName, { color: isDark ? '#D6D3D1' : '#44403C' }]}>
                {att.name}
              </Text>
              <Pressable onPress={() => removeAttachment(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#A1A1AA" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Attach menu */}
      {showAttachMenu && (
        <View style={[styles.attachMenu, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
          <Pressable onPress={pickImage} style={styles.attachOption}>
            <Ionicons name="image-outline" size={20} color="#3B82F6" />
            <Text style={[styles.attachOptionText, { color: isDark ? '#D6D3D1' : '#44403C' }]}>Photo</Text>
          </Pressable>
          <Pressable onPress={pickDocument} style={styles.attachOption}>
            <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
            <Text style={[styles.attachOptionText, { color: isDark ? '#D6D3D1' : '#44403C' }]}>Document</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* Attach button */}
        <Pressable
          onPress={handleAttachPress}
          disabled={disabled}
          style={[styles.attachButton]}
          accessibilityRole="button"
          accessibilityLabel="Attach file"
        >
          <Ionicons name="add" size={24} color={disabled ? '#A1A1AA' : '#3B82F6'} />
        </Pressable>

        <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
          <TextInput
            value={message}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#A1A1AA"
            multiline
            maxLength={10000}
            editable={!disabled}
            onSubmitEditing={handleSubmitEditing}
            returnKeyType="send"
            enablesReturnKeyAutomatically={true}
            blurOnSubmit={true}
            style={[styles.input, isDark && styles.inputDark]}
            accessible
            accessibilityLabel="Message input"
            accessibilityHint="Type your message here. Press Enter or the send button to send."
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? '#3B82F6' : (isDark ? '#292524' : '#D6D3D1') },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons
            name="send"
            size={18}
            color={canSend ? '#FFFFFF' : '#A1A1AA'}
            style={styles.sendIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  containerDark: {
    borderTopColor: '#332F2B',
    backgroundColor: '#1A1816',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F5F5F4',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  inputContainerDark: {
    backgroundColor: '#252220',
  },
  input: {
    fontSize: 16,
    color: '#1C1917',
    minHeight: 24,
    maxHeight: 120,
    lineHeight: 22,
  },
  inputDark: {
    color: '#FAFAF9',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendIcon: {
    marginLeft: 2,
  },
  attachmentRow: {
    marginBottom: 8,
    maxHeight: 60,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
    maxWidth: 180,
  },
  attachmentThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  attachmentName: {
    fontSize: 12,
    flex: 1,
  },
  attachMenu: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 8,
    marginBottom: 8,
    gap: 12,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  attachOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
