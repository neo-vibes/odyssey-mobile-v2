import { StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'Send'>;

export function SendScreen({ route }: Props) {
  const tokenMint = route.params?.tokenMint;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send</Text>
      <Text style={styles.subtitle}>
        {tokenMint ? `Token: ${tokenMint}` : 'Send SOL or tokens'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888888',
    fontSize: 16,
  },
});
