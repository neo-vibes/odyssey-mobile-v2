/**
 * ApproveSessionScreen - Review and approve/reject agent session requests
 * Presented as a modal when an agent requests a spending session
 */

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';
import type { SessionDetailsResponse, SpendingLimit } from '../types';
import { api, OdysseyApiError, NetworkError } from '../services/api';

type Props = RootStackScreenProps<'ApproveSession'>;

type ScreenState =
  | { status: 'loading' }
  | { status: 'loaded'; details: SessionDetailsResponse & { agentName?: string } }
  | { status: 'approving' }
  | { status: 'rejecting' }
  | { status: 'approved' }
  | { status: 'rejected' }
  | { status: 'error'; message: string };

export function ApproveSessionScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // Fetch session details on mount
  useEffect(() => {
    let mounted = true;

    const loadDetails = async () => {
      try {
        const details = await api.session.getDetails(requestId);

        if (!mounted) return;

        // If already processed, show appropriate state
        if (details.status === 'approved') {
          setState({ status: 'approved' });
          return;
        }
        if (details.status === 'rejected') {
          setState({ status: 'rejected' });
          return;
        }
        if (details.status === 'expired') {
          setState({ status: 'error', message: 'This session request has expired' });
          return;
        }

        setState({ status: 'loaded', details });
      } catch (error) {
        if (!mounted) return;

        let message = 'Failed to load session details';

        if (error instanceof OdysseyApiError) {
          message = error.message;
        } else if (error instanceof NetworkError) {
          message = 'Network error. Please check your connection.';
        }

        setState({ status: 'error', message });
      }
    };

    loadDetails();

    return () => {
      mounted = false;
    };
  }, [requestId]);

  // Handle approve
  const handleApprove = async () => {
    if (state.status !== 'loaded') return;

    setState({ status: 'approving' });

    try {
      // For now, we'll use a placeholder signature
      // In production, this would be signed by the wallet's passkey
      const walletPubkey = state.details.session?.walletPubkey ?? '';

      await api.session.approve({
        requestId,
        walletPubkey,
        signature: 'placeholder-signature', // TODO: Sign with passkey
      });

      setState({ status: 'approved' });
    } catch (error) {
      let message = 'Failed to approve session';

      if (error instanceof OdysseyApiError) {
        message = error.message;
      } else if (error instanceof NetworkError) {
        message = 'Network error. Please check your connection.';
      }

      setState({ status: 'error', message });
    }
  };

  // Handle reject
  const handleReject = async () => {
    setState({ status: 'rejecting' });

    try {
      await api.session.reject(requestId);
      setState({ status: 'rejected' });
    } catch (error) {
      let message = 'Failed to reject session';

      if (error instanceof OdysseyApiError) {
        message = error.message;
      } else if (error instanceof NetworkError) {
        message = 'Network error. Please check your connection.';
      }

      setState({ status: 'error', message });
    }
  };

  // Handle close/done
  const handleClose = () => {
    navigation.goBack();
  };

  // Format spending limit for display
  const formatLimit = (limit: SpendingLimit): string => {
    const amount = limit.amount / Math.pow(10, limit.decimals);
    const symbol = limit.symbol ?? (limit.mint === 'native' ? 'SOL' : 'tokens');
    return `${amount.toLocaleString()} ${symbol}`;
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (seconds < 86400) {
      const hours = Math.round(seconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.round(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Render loading state
  if (state.status === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading session request...</Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (state.status === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>✕</Text>
          <Text style={styles.resultTitle}>Error</Text>
          <Text style={styles.resultSubtitle}>{state.message}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
            <Text style={styles.primaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render approved state
  if (state.status === 'approved') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.resultTitle}>Session Approved</Text>
          <Text style={styles.resultSubtitle}>
            The agent can now execute transactions within the approved limits.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render rejected state
  if (state.status === 'rejected') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.rejectedIcon}>✕</Text>
          <Text style={styles.resultTitle}>Session Rejected</Text>
          <Text style={styles.resultSubtitle}>
            The agent session request has been rejected. No transactions will be allowed.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render approving/rejecting state
  if (state.status === 'approving' || state.status === 'rejecting') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>
            {state.status === 'approving' ? 'Approving session...' : 'Rejecting session...'}
          </Text>
        </View>
      </View>
    );
  }

  // Render loaded state with session details
  const { details } = state;
  const session = details.session;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Session Request</Text>
          <Text style={styles.subtitle}>An agent is requesting access to your wallet</Text>
        </View>

        {/* Agent Info */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Agent</Text>
          <Text style={styles.agentName}>{details.agentName ?? 'Unknown Agent'}</Text>
        </View>

        {/* Spending Limits */}
        {session?.limits && session.limits.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Spending Limits</Text>
            {session.limits.map((limit, index) => (
              <View key={`${limit.mint}-${index}`} style={styles.limitRow}>
                <Text style={styles.limitIcon}>💰</Text>
                <Text style={styles.limitAmount}>{formatLimit(limit)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Duration */}
        {session?.durationSeconds && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Duration</Text>
            <View style={styles.durationRow}>
              <Text style={styles.durationIcon}>⏱</Text>
              <Text style={styles.durationText}>{formatDuration(session.durationSeconds)}</Text>
            </View>
          </View>
        )}

        {/* Warning */}
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Important</Text>
          <Text style={styles.warningText}>
            By approving this session, you allow the agent to execute transactions on your behalf up
            to the specified limits. The agent will be able to transfer funds without additional
            approval until the session expires or limits are reached.
          </Text>
          <Text style={styles.warningText}>Only approve sessions from agents you trust.</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.rejectButton} onPress={handleReject} activeOpacity={0.7}>
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.approveButton} onPress={handleApprove} activeOpacity={0.7}>
          <Text style={styles.approveButtonText}>Approve</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#888888',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888888',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardLabel: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  agentName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  limitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  limitAmount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: '#1a1a0a',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3a3a1a',
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  warningTitle: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  warningText: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 16,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  resultSubtitle: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  successIcon: {
    fontSize: 64,
    color: '#22c55e',
  },
  errorIcon: {
    fontSize: 64,
    color: '#ef4444',
  },
  rejectedIcon: {
    fontSize: 64,
    color: '#888888',
  },
});
