/**
 * SessionDetailScreen - Session details with spending progress and transaction log
 * Shows status, limits, spent amounts, expiry, and transaction history
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
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import type { Session, SpendingLimit, Transaction, SessionStatus } from '../types';
import { useSessionStore } from '../store/useSessionStore';
import { useAgentStore } from '../store/useAgentStore';

type Props = RootStackScreenProps<'SessionDetail'>;

// ============================================================================
// Constants & Helpers
// ============================================================================

// Status color mapping
const STATUS_COLORS: Record<SessionStatus, string> = {
  pending: '#3b82f6', // Blue
  active: '#22c55e', // Green
  expired: '#6b7280', // Gray
  revoked: '#ef4444', // Red
  exhausted: '#f97316', // Orange
};

// Status labels and descriptions
const STATUS_INFO: Record<SessionStatus, { label: string; description: string; icon: string }> = {
  pending: {
    label: 'Pending Approval',
    description: 'Waiting for wallet approval',
    icon: '⏳',
  },
  active: {
    label: 'Active',
    description: 'Session is active and can make transactions',
    icon: '✅',
  },
  expired: {
    label: 'Expired',
    description: 'Session time limit has been reached',
    icon: '⏰',
  },
  revoked: {
    label: 'Revoked',
    description: 'Session was manually revoked',
    icon: '🚫',
  },
  exhausted: {
    label: 'Exhausted',
    description: 'Spending limits have been reached',
    icon: '💸',
  },
};

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// Format relative time for session expiry
function formatExpiry(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) return 'Expired';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m remaining`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m remaining`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h remaining`;
}

// Format amount with decimals
function formatAmount(amount: number, decimals: number, symbol?: string): string {
  const displayAmount = amount / Math.pow(10, decimals);
  const formatted = displayAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, 6),
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

// Get symbol for mint
function getSymbol(limit: SpendingLimit): string {
  return limit.symbol || (limit.mint === 'native' ? 'SOL' : 'tokens');
}

// Truncate address/signature for display
function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Open explorer for transaction
function openExplorer(signature: string) {
  const url = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  Linking.openURL(url);
}

// ============================================================================
// Components
// ============================================================================

// Status Banner Component
function StatusBanner({ status }: { status: SessionStatus }) {
  const statusColor = STATUS_COLORS[status];
  const info = STATUS_INFO[status];

  return (
    <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
      <Text style={styles.statusIcon}>{info.icon}</Text>
      <View style={styles.statusTextContainer}>
        <Text style={[styles.statusLabel, { color: statusColor }]}>{info.label}</Text>
        <Text style={styles.statusDescription}>{info.description}</Text>
      </View>
    </View>
  );
}

// Spending Progress Component
function SpendingProgress({ limit, spent }: { limit: SpendingLimit; spent: number }) {
  const symbol = getSymbol(limit);
  const limitAmount = limit.amount;
  const spentAmount = spent;

  // Calculate progress percentage (spent is in base units, limit.amount is in base units)
  const percentage = limitAmount > 0 ? Math.min((spentAmount / limitAmount) * 100, 100) : 0;
  const isExhausted = spentAmount >= limitAmount;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressSymbol}>{symbol}</Text>
        <Text style={[styles.progressPercent, isExhausted && styles.progressExhausted]}>
          {percentage.toFixed(1)}%
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
              backgroundColor: isExhausted ? '#ef4444' : '#7c3aed',
            },
          ]}
        />
      </View>

      <View style={styles.progressAmounts}>
        <Text style={styles.progressSpent}>{formatAmount(spentAmount, limit.decimals)} spent</Text>
        <Text style={styles.progressLimit}>
          of {formatAmount(limitAmount, limit.decimals)} {symbol}
        </Text>
      </View>
    </View>
  );
}

// Session Info Card Component
function SessionInfoCard({ session, agentName }: { session: Session; agentName: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Session Information</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Agent</Text>
        <Text style={styles.infoValue}>{agentName}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Session Key</Text>
        <Text style={styles.infoValueMono}>{truncateAddress(session.sessionPubkey, 8)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Duration</Text>
        <Text style={styles.infoValue}>{formatDuration(session.durationSeconds)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Created</Text>
        <Text style={styles.infoValue}>{formatDate(session.createdAt)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Expires</Text>
        <Text style={[styles.infoValue, session.status === 'active' && styles.infoValueHighlight]}>
          {session.status === 'active'
            ? formatExpiry(session.expiresAt)
            : formatDate(session.expiresAt)}
        </Text>
      </View>
    </View>
  );
}

// Transaction List Item Component
function TransactionListItem({
  transaction,
  onPress,
}: {
  transaction: Transaction;
  onPress: () => void;
}) {
  const statusColor =
    transaction.status === 'confirmed'
      ? '#22c55e'
      : transaction.status === 'pending'
        ? '#f59e0b'
        : '#ef4444';

  const symbol = transaction.symbol || (transaction.mint ? 'Token' : 'SOL');
  const decimals = transaction.mint ? 6 : 9; // Default decimals

  return (
    <TouchableOpacity style={styles.transactionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.transactionIcon}>
        <Text style={styles.transactionIconText}>↗️</Text>
      </View>

      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionType}>
            {transaction.type === 'token_transfer' ? 'Token Transfer' : 'Transfer'}
          </Text>
          <View style={[styles.transactionStatusDot, { backgroundColor: statusColor }]} />
        </View>

        <Text style={styles.transactionAmount}>
          -{formatAmount(transaction.amount, decimals, symbol)}
        </Text>

        <Text style={styles.transactionRecipient}>To: {truncateAddress(transaction.to, 6)}</Text>
      </View>

      <View style={styles.transactionMeta}>
        <Text style={styles.transactionTime}>
          {new Date(transaction.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text style={styles.transactionSig}>{truncateAddress(transaction.signature, 4)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Empty Transactions State Component
function EmptyTransactionsState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptySubtitle}>This session has not made any transactions yet</Text>
    </View>
  );
}

// ============================================================================
// Main Screen Component
// ============================================================================

export function SessionDetailScreen({ route }: Props) {
  const { sessionId } = route.params;
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store hooks
  const { sessions, loadSessions, updateSession } = useSessionStore();
  const { agents, loadAgents } = useAgentStore();

  // Find the session
  const session = sessions.find((s) => s.id === sessionId);

  // Find the associated agent
  const agent = session ? agents.find((a) => a.id === session.agentId) : null;

  // Mock transactions for this session (in a real app, these would be fetched)
  // This demonstrates the transaction list UI
  const [transactions] = useState<Transaction[]>([]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadSessions();
      loadAgents();
    }, [loadSessions, loadAgents])
  );

  // Set up header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Session Details',
      headerStyle: {
        backgroundColor: '#0a0a0a',
      },
      headerTintColor: '#ffffff',
    });
  }, [navigation]);

  // Check for session expiry
  useEffect(() => {
    if (session && session.status === 'active' && session.expiresAt < Date.now()) {
      updateSession(session.id, { status: 'expired' });
    }
  }, [session, updateSession]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadSessions(), loadAgents()]);
    setIsRefreshing(false);
  }, [loadSessions, loadAgents]);

  // Handle transaction press - open in explorer
  const handleTransactionPress = (transaction: Transaction) => {
    openExplorer(transaction.signature);
  };

  // Handle revoke with confirmation
  const handleRevoke = () => {
    if (!session) return;

    Alert.alert(
      'Revoke Session',
      'Are you sure you want to revoke this session? The agent will no longer be able to make transactions.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            await updateSession(session.id, { status: 'revoked' });
            // Optionally navigate back
            // navigation.goBack();
          },
        },
      ]
    );
  };

  // Loading state
  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  const isActive = session.status === 'active';

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.signature}
        renderItem={({ item }) => (
          <TransactionListItem transaction={item} onPress={() => handleTransactionPress(item)} />
        )}
        ListHeaderComponent={
          <>
            {/* Status Banner */}
            <StatusBanner status={session.status} />

            {/* Spending Progress Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Spending</Text>
              {session.limits.map((limit, index) => (
                <SpendingProgress
                  key={`${limit.mint}-${index}`}
                  limit={limit}
                  spent={session.spent[limit.mint] || 0}
                />
              ))}
            </View>

            {/* Session Info Section */}
            <SessionInfoCard session={session} agentName={agent?.name || 'Unknown Agent'} />

            {/* Transactions Header */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <Text style={styles.sectionCount}>{transactions.length}</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={EmptyTransactionsState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
      />

      {/* Revoke Button - only show for active sessions */}
      {isActive && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.revokeButton} onPress={handleRevoke} activeOpacity={0.7}>
            <Text style={styles.revokeButtonText}>Revoke Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

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
  listContent: {
    paddingBottom: 100,
  },

  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#888888',
  },

  // Section
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionCount: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 12,
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressSymbol: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  progressPercent: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
  progressExhausted: {
    color: '#ef4444',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressSpent: {
    color: '#ffffff',
    fontSize: 14,
  },
  progressLimit: {
    color: '#888888',
    fontSize: 14,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  infoLabel: {
    color: '#888888',
    fontSize: 14,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  infoValueMono: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  infoValueHighlight: {
    color: '#22c55e',
  },

  // Transaction Card
  transactionCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionType: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  transactionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionAmount: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionRecipient: {
    color: '#888888',
    fontSize: 12,
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  transactionTime: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 4,
  },
  transactionSig: {
    color: '#666666',
    fontSize: 10,
    fontFamily: 'monospace',
  },

  // Empty State
  emptyContainer: {
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
  revokeButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  revokeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
