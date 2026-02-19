import { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';
import { isValidAddress, shortenAddress, formatSol, solToLamports } from '../services/solana';

type Props = RootStackScreenProps<'Send'>;

// Mock wallet data
const MOCK_WALLET_ADDRESS = '7NpVxKv7z8yKPQWnqvWhcEz8xKZcvqRK9wNbK3vKz9mH';
const MOCK_SOL_BALANCE = 2.5; // SOL

export function SendScreen({ route, navigation }: Props) {
  const tokenMint = route.params?.tokenMint;
  const isNativeSOL = !tokenMint || tokenMint === 'native';

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  // Validation
  const recipientError = useMemo(() => {
    if (!recipient) return null;
    if (!isValidAddress(recipient)) return 'Invalid Solana address';
    if (recipient === MOCK_WALLET_ADDRESS) return 'Cannot send to yourself';
    return null;
  }, [recipient]);

  const amountError = useMemo(() => {
    if (!amount) return null;
    const num = parseFloat(amount);
    if (isNaN(num)) return 'Invalid amount';
    if (num <= 0) return 'Amount must be greater than 0';
    if (isNativeSOL && num > MOCK_SOL_BALANCE) return 'Insufficient balance';
    return null;
  }, [amount, isNativeSOL]);

  const isValid = useMemo(() => {
    return (
      recipient.length > 0 &&
      amount.length > 0 &&
      !recipientError &&
      !amountError &&
      parseFloat(amount) > 0
    );
  }, [recipient, amount, recipientError, amountError]);

  const handleSend = useCallback(async () => {
    if (!isValid) return;

    setSending(true);
    try {
      // Simulate sending transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const lamports = solToLamports(parseFloat(amount));
      Alert.alert(
        'Transaction Sent',
        `Sent ${formatSol(lamports, 4)} SOL to ${shortenAddress(recipient)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to send transaction. Please try again.');
    } finally {
      setSending(false);
    }
  }, [isValid, amount, recipient, navigation]);

  const handleMax = useCallback(() => {
    if (isNativeSOL) {
      // Leave some SOL for fees
      const maxAmount = Math.max(0, MOCK_SOL_BALANCE - 0.01);
      setAmount(maxAmount.toString());
    }
  }, [isNativeSOL]);

  const handlePaste = useCallback(async () => {
    // In a real app, this would use Clipboard API
    Alert.alert('Paste', 'Clipboard paste would go here');
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Token Info */}
        <View style={styles.tokenInfo}>
          <View style={styles.tokenIcon}>
            <Text style={styles.tokenIconText}>{isNativeSOL ? '◎' : '?'}</Text>
          </View>
          <Text style={styles.tokenLabel}>
            {isNativeSOL ? 'Sending SOL' : `Sending ${shortenAddress(tokenMint || '', 4)}`}
          </Text>
          <Text style={styles.balanceText}>
            Available: {isNativeSOL ? `${MOCK_SOL_BALANCE} SOL` : 'N/A'}
          </Text>
        </View>

        {/* Recipient Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Recipient</Text>
            <TouchableOpacity onPress={handlePaste} activeOpacity={0.7}>
              <Text style={styles.actionText}>Paste</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.textInput, recipientError ? styles.inputError : null]}
            placeholder="Enter Solana address"
            placeholderTextColor="#666666"
            value={recipient}
            onChangeText={setRecipient}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sending}
          />
          {recipientError && <Text style={styles.errorText}>{recipientError}</Text>}
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Amount</Text>
            <TouchableOpacity onPress={handleMax} activeOpacity={0.7}>
              <Text style={styles.actionText}>Max</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={[styles.textInput, styles.amountInput, amountError ? styles.inputError : null]}
              placeholder="0.00"
              placeholderTextColor="#666666"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!sending}
            />
            <View style={styles.amountSuffix}>
              <Text style={styles.amountSuffixText}>{isNativeSOL ? 'SOL' : 'TOKEN'}</Text>
            </View>
          </View>
          {amountError && <Text style={styles.errorText}>{amountError}</Text>}
        </View>

        {/* Transaction Summary */}
        {isValid && (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To</Text>
              <Text style={styles.summaryValue}>{shortenAddress(recipient)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>
                {parseFloat(amount).toFixed(4)} {isNativeSOL ? 'SOL' : 'TOKEN'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network Fee</Text>
              <Text style={styles.summaryValue}>~0.000005 SOL</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Send Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.sendButton, !isValid && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!isValid || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  content: {
    padding: 20,
  },
  tokenInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  tokenIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tokenIconText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
  tokenLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceText: {
    color: '#888888',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  amountSuffix: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderLeftWidth: 0,
  },
  amountSuffixText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
  },
  summary: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    color: '#888888',
    fontSize: 14,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 36,
  },
  sendButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  sendButtonDisabled: {
    backgroundColor: '#4a4a4a',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
