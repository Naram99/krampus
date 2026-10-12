import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, sharedStyles as s } from '../utils/theme';

export function Button({ title, onPress, disabled = false, variant = 'primary', label }: {
  title: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; label?: string;
}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label ?? title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, variant === 'secondary' ? styles.secondary : variant === 'danger' ? styles.danger : styles.primary, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, variant === 'secondary' && { color: colors.darkBrown }]}>{title}</Text>
  </TouchableOpacity>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={{ gap: 6 }}>
    <Text style={s.text}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.gray} {...props} style={[styles.input, props.style]} />
    {error ? <Text accessibilityLiveRegion="polite" style={s.warning}>{error}</Text> : null}
  </View>;
}
export function Dialog({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.overlay}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogScroll}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text accessibilityRole="header" style={s.title}>{title}</Text>{children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
export function Screen({ children }: { children: React.ReactNode }) {
  return <SafeAreaView edges={['left', 'right']} style={s.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  button: { minHeight: 48, minWidth: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  primary: { backgroundColor: colors.christmasGreen, borderColor: colors.christmasGreen },
  danger: { backgroundColor: colors.christmasRed, borderColor: colors.christmasRed },
  secondary: { backgroundColor: colors.white, borderColor: colors.gingerbread },
  disabled: { opacity: 0.6 }, buttonText: { color: colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.gingerbread, borderRadius: 8, padding: 12, fontSize: 16, color: colors.darkBrown, backgroundColor: colors.snow },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialogScroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  dialog: { backgroundColor: colors.white, borderRadius: 16, padding: 20, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
});
