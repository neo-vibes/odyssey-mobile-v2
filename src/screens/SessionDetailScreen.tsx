import { StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'SessionDetail'>;

export function SessionDetailScreen({ route }: Props) {
  const { sessionId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Details</Text>
      <Text style={styles.subtitle}>Session ID: {sessionId}</Text>
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
