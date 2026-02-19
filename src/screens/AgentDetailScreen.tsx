/**
 * AgentDetailScreen - Agent details with sessions list
 * Shows agent info, sessions, and unpair functionality
 */

import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import type { Session, SpendingLimit } from '../types';
import { useAgentStore } from '../store/useAgentStore';
import { useSessionStore } from '../store/useSessionStore';

type Props = RootStackScreenProps<'AgentDetail'>;

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', // Green
  inactive: '#f59e0b', // Amber
  revoked: '#ef4444', // Red
  pending: '#3b82f6', // Blue
  expired: '#6b7280', // Gray
  exhausted: '#f97316', // Orange
};

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format relative time for session expiry
function formatExpiry(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) return 'Expired';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m remaining`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h remaining`;

  const days = Math.floor(hours / 24);
  return `${days}d remaining`;
}

// Format spent amount
function formatSpentAmount(spent: number, limit: SpendingLimit): string {
  const spentAmount = spent / Math.pow(10, limit.decimals);
  const limitAmount = limit.amount / Math.pow(10, limit.decimals);
  const symbol = limit.symbol || (limit.mint === 'native' ? 'SOL' : 'tokens');
  return `${spentAmount.toFixed(4)} / ${limitAmount.toFixed(4)} ${symbol}`;
}

// Session list item component
function SessionListItem({ session, onPress }: { session: Session; onPress: () => void }) {
  const statusColor = STATUS_COLORS[session.status] || '#6b7280';

  return (
    <TouchableOpacity style={styles.sessionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.sessionHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </Text>
        <Text style={styles.sessionExpiry}>
          {session.status === 'active' ? formatExpiry(session.expiresAt) : ''}
        </Text>
      </View>

      <View style={styles.limitsContainer}>
        <Text style={styles.limitsLabel}>Limits:</Text>
        {session.limits.map((limit, index) => {
          const spent = session.spent[limit.mint] || 0;
          return (
            <View key={index} style={styles.limitRow}>
              <Text style={styles.limitText}>{formatSpentAmount(spent, limit)}</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min((spent / (limit.amount * Math.pow(10, limit.decimals))) * 100, 100)}%`,
                      backgroundColor:
                        spent >= limit.amount * Math.pow(10, limit.decimals)
                          ? '#ef4444'
                          : '#7c3aed',
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sessionMeta}>Created {formatDate(session.createdAt)}</Text>
    </TouchableOpacity>
  );
}

// Empty sessions state component
function EmptySessionsState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No Sessions</Text>
      <Text style={styles.emptySubtitle}>
        This agent has not requested any spending sessions yet
      </Text>
    </View>
  );
}

export function AgentDetailScreen({ route }: Props) {
  const { agentId } = route.params;
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store hooks
  const { agents, loadAgents, removeAgent, updateAgentStatus } = useAgentStore();
  const { sessions, loadSessions, removeSessionsForAgent } = useSessionStore();

  // Find the agent
  const agent = agents.find((a) => a.id === agentId);
  const agentSessions = sessions.filter((s) => s.agentId === agentId);

  // Sort sessions: active first, then by creation date (newest first)
  const sortedSessions = [...agentSessions].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return b.createdAt - a.createdAt;
  });

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadAgents();
      loadSessions();
    }, [loadAgents, loadSessions])
  );

  // Set up header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: agent?.name || 'Agent Details',
      headerStyle: {
        backgroundColor: '#0a0a0a',
      },
      headerTintColor: '#ffffff',
    });
  }, [navigation, agent?.name]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadAgents(), loadSessions()]);
    setIsRefreshing(false);
  }, [loadAgents, loadSessions]);

  // Handle session press
  const handleSessionPress = (session: Session) => {
    navigation.navigate('SessionDetail', { sessionId: session.id });
  };

  // Handle unpair with confirmation
  const handleUnpair = () => {
    Alert.alert(
      'Unpair Agent',
      `Are you sure you want to unpair "${agent?.name}"? This will revoke all active sessions and remove the agent.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            if (!agent) return;
            // Revoke the agent and remove sessions
            await updateAgentStatus(agentId, 'revoked');
            await removeSessionsForAgent(agentId);
            await removeAgent(agentId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Handle agent not found
  if (!agent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading agent...</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[agent.status] || '#6b7280';

  return (
    <View style={styles.container}>
      {/* Agent Info Card */}
      <View style={styles.agentCard}>
        <View style={styles.agentHeader}>
          <Text style={styles.agentIcon}>🤖</Text>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentMeta}>Paired on {formatDate(agent.pairedAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{agentSessions.length}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {agentSessions.filter((s) => s.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </View>

      {/* Sessions Section */}
      <View style={styles.sessionsHeader}>
        <Text style={styles.sectionTitle}>Sessions</Text>
      </View>

      <FlatList
        data={sortedSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionListItem session={item} onPress={() => handleSessionPress(item)} />
        )}
        contentContainerStyle={sortedSessions.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={EmptySessionsState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
      />

      {/* Unpair Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.unpairButton} onPress={handleUnpair} activeOpacity={0.7}>
          <Text style={styles.unpairButtonText}>Unpair Agent</Text>
        </TouchableOpacity>
      </View>
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
  loadingText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 12,
  },

  // Agent Card
  agentCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  agentMeta: {
    color: '#888888',
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#2a2a2a',
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
  },

  // Sessions Section
  sessionsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Session Card
  sessionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sessionExpiry: {
    color: '#888888',
    fontSize: 12,
  },
  limitsContainer: {
    marginBottom: 8,
  },
  limitsLabel: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 8,
  },
  limitRow: {
    marginBottom: 8,
  },
  limitText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  sessionMeta: {
    color: '#666666',
    fontSize: 12,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  unpairButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  unpairButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
