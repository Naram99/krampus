import { StyleSheet } from 'react-native';

export const colors = {
  christmasRed: '#B21B35', christmasGreen: '#176B26', gingerbread: '#884316', darkBrown: '#55321D',
  snow: '#FFFAF0', gold: '#FFD700', darkRed: '#8B0000', white: '#FFFFFF', lightGray: '#F0E9E0',
  gray: '#595959', darkGray: '#333333', success: '#176B26', error: '#B21B35',
};
export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.snow },
  content: { padding: 16, paddingBottom: 32, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { padding: 16, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.darkBrown },
  heading: { fontSize: 18, fontWeight: '600', color: colors.darkBrown },
  text: { fontSize: 16, color: colors.darkBrown },
  muted: { fontSize: 14, color: colors.gray },
  warning: { fontSize: 16, color: colors.error, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
});
