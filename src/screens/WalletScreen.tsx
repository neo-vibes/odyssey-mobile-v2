import { StyleSheet, Text, View } from 'react-native';
import type { TabScreenProps } from '../types/navigation';

type Props = TabScreenProps<'Wallet'>;

export function WalletScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.subtitle}>Your Solana assets</Text>
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
