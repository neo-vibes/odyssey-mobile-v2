/**
 * PairAgentScreen - Pair a new AI agent with code input and polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';
import type { Agent, PairingStatusResponse } from '../types';
import { api, OdysseyApiError, NetworkError } from '../services/api';
import { useAgentStore } from '../store/useAgentStore';

type Props = RootStackScreenProps<'PairAgent'>;

type PairingState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'polling'; requestId: string }
  | { status: 'success'; agentName: string }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 120000; // 2 minutes

export function PairAgentScreen({ navigation }: Props) {
  const [code, setCode] = useState('');
  const [pairingState, setPairingState] = useState<PairingState>({ status: 'idle' });
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const { addAgent } = useAgentStore();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for pairing approval
  const startPolling = useCallback(
    (requestId: string) => {
      pollStartRef.current = Date.now();

      const poll = async () => {
        // Check timeout
        if (Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setPairingState({ status: 'error', message: 'Pairing request timed out' });
          return;
        }

        try {
          const response: PairingStatusResponse = await api.pairing.getStatus(requestId);

          switch (response.status) {
            case 'approved': {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }

              // Add agent to store
              const newAgent: Agent = {
                id: response.agentId ?? requestId,
                name: response.agentName ?? 'Unknown Agent',
                pairedAt: Date.now(),
                lastSeen: null,
                status: 'active',
              };
              await addAgent(newAgent);

              setPairingState({
                status: 'success',
                agentName: response.agentName ?? 'Unknown Agent',
              });
              break;
            }

            case 'rejected':
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              setPairingState({ status: 'error', message: 'Pairing request was rejected' });
              break;

            case 'expired':
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              setPairingState({ status: 'error', message: 'Pairing request expired' });
              break;

            case 'pending':
              // Keep polling
              break;
          }
        } catch {
          // Don't stop polling on network errors, silently retry
        }
      };

      // Initial poll
      poll();

      // Start interval
      pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [addAgent]
  );

  // Submit pairing code
  const handleSubmit = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setPairingState({ status: 'error', message: 'Please enter a pairing code' });
      return;
    }

    setPairingState({ status: 'submitting' });

    try {
      // The code entered is the requestId from the agent's pairing request
      // We poll its status to see when the agent completes the pairing
      setPairingState({ status: 'polling', requestId: trimmedCode });
      startPolling(trimmedCode);
    } catch (error) {
      let message = 'Failed to start pairing';

      if (error instanceof OdysseyApiError) {
        message = error.message;
      } else if (error instanceof NetworkError) {
        message = 'Network error. Please check your connection.';
      }

      setPairingState({ status: 'error', message });
    }
  };

  // Handle retry
  const handleRetry = () => {
    setCode('');
    setPairingState({ status: 'idle' });
  };

  // Handle done (success state)
  const handleDone = () => {
    navigation.goBack();
  };

  // Render based on state
  const renderContent = () => {
    switch (pairingState.status) {
      case 'idle':
      case 'submitting':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.title}>Pair Agent</Text>
            <Text style={styles.subtitle}>Enter the pairing code shown by your AI agent</Text>

            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Enter pairing code"
              placeholderTextColor="#666666"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={pairingState.status !== 'submitting'}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!code.trim() || pairingState.status === 'submitting') &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!code.trim() || pairingState.status === 'submitting'}
              activeOpacity={0.7}
            >
              {pairingState.status === 'submitting' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'polling':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.statusTitle}>Waiting for Agent</Text>
            <Text style={styles.statusSubtitle}>Waiting for the agent to complete pairing...</Text>
            <Text style={styles.statusCode}>Code: {pairingState.requestId}</Text>

            <TouchableOpacity style={styles.cancelButton} onPress={handleRetry}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      case 'success':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.statusTitle}>Pairing Successful!</Text>
            <Text style={styles.statusSubtitle}>
              {pairingState.agentName} is now paired with your wallet
            </Text>

            <TouchableOpacity style={styles.submitButton} onPress={handleDone}>
              <Text style={styles.submitButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.errorIcon}>✕</Text>
            <Text style={styles.statusTitle}>Pairing Failed</Text>
            <Text style={styles.statusSubtitle}>{pairingState.message}</Text>

            <TouchableOpacity style={styles.submitButton} onPress={handleRetry}>
              <Text style={styles.submitButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderContent()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  formContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
  },
  submitButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: '#4a4a4a',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  statusCode: {
    color: '#666666',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 32,
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  cancelButtonText: {
    color: '#888888',
    fontSize: 16,
  },
  successIcon: {
    fontSize: 64,
    color: '#22c55e',
  },
  errorIcon: {
    fontSize: 64,
    color: '#ef4444',
  },
});
