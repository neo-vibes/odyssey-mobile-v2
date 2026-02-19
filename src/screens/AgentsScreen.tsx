import { StyleSheet, Text, View } from 'react-native';
import type { TabScreenProps } from '../types/navigation';

type Props = TabScreenProps<'Agents'>;

export function AgentsScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agents</Text>
      <Text style={styles.subtitle}>Paired AI agents</Text>
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
