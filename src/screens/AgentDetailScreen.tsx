import { StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'AgentDetail'>;

export function AgentDetailScreen({ route }: Props) {
  const { agentId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agent Details</Text>
      <Text style={styles.subtitle}>Agent ID: {agentId}</Text>
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
