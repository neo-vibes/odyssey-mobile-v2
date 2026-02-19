/**
 * AgentsScreen - List of paired AI agents with status indicators
 */

import { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { TabScreenProps } from '../types/navigation';
import type { Agent } from '../types';
import { useAgentStore } from '../store/useAgentStore';

type Props = TabScreenProps<'Agents'>;

// Status color mapping
const STATUS_COLORS: Record<Agent['status'], string> = {
  active: '#22c55e', // Green
  inactive: '#f59e0b', // Amber
  revoked: '#ef4444', // Red
};

// Format relative time
function formatLastSeen(timestamp: number | null): string {
  if (timestamp === null) return 'Never';

  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

// Agent list item component
function AgentListItem({ agent, onPress }: { agent: Agent; onPress: () => void }) {
  const statusColor = STATUS_COLORS[agent.status];

  return (
    <TouchableOpacity style={styles.agentCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.agentInfo}>
        <View style={styles.agentHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.agentName}>{agent.name}</Text>
        </View>
        <Text style={styles.agentMeta}>Last seen: {formatLastSeen(agent.lastSeen)}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Empty state component
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🤖</Text>
      <Text style={styles.emptyTitle}>No Agents Paired</Text>
      <Text style={styles.emptySubtitle}>
        Pair an AI agent to let it request spending sessions from your wallet
      </Text>
    </View>
  );
}

export function AgentsScreen(_props: Props) {
  const navigation = useNavigation();
  const { agents, isLoading, loadAgents } = useAgentStore();

  // Load agents on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadAgents();
    }, [loadAgents])
  );

  // Set up header with Pair button
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Agents',
      headerStyle: {
        backgroundColor: '#0a0a0a',
      },
      headerTintColor: '#ffffff',
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('PairAgent')}
        >
          <Text style={styles.headerButtonText}>+ Pair</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleAgentPress = (agent: Agent) => {
    navigation.navigate('AgentDetail', { agentId: agent.id });
  };

  const renderItem = ({ item }: { item: Agent }) => (
    <AgentListItem agent={item} onPress={() => handleAgentPress(item)} />
  );

  if (isLoading && agents.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={agents.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadAgents}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    marginRight: 8,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  agentCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  agentInfo: {
    flex: 1,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  agentName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  agentMeta: {
    color: '#888888',
    fontSize: 14,
    marginLeft: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
