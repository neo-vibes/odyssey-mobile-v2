import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Share, ScrollView } from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';
import { shortenAddress } from '../services/solana';

type Props = RootStackScreenProps<'Receive'>;

// Mock wallet data
const MOCK_WALLET_ADDRESS = '7NpVxKv7z8yKPQWnqvWhcEz8xKZcvqRK9wNbK3vKz9mH';

export function ReceiveScreen(_props: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    // In a real app, use Clipboard.setString(MOCK_WALLET_ADDRESS)
    // For now, simulate the action
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied', 'Address copied to clipboard');
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: MOCK_WALLET_ADDRESS,
        title: 'My Solana Address',
      });
    } catch {
      // User cancelled or error occurred
    }
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Receive SOL & Tokens</Text>
        <Text style={styles.subtitle}>Share your address to receive Solana assets</Text>
      </View>

      {/* QR Code Placeholder */}
      <View style={styles.qrContainer}>
        <View style={styles.qrPlaceholder}>
          <View style={styles.qrGrid}>
            {/* Simple QR-like pattern placeholder */}
            {[...Array(7)].map((_, rowIndex) => (
              <View key={rowIndex} style={styles.qrRow}>
                {[...Array(7)].map((_, colIndex) => {
                  const isCorner =
                    (rowIndex < 3 && colIndex < 3) ||
                    (rowIndex < 3 && colIndex > 3) ||
                    (rowIndex > 3 && colIndex < 3);
                  const isActive = isCorner || Math.random() > 0.5;
                  return (
                    <View
                      key={colIndex}
                      style={[
                        styles.qrCell,
                        isActive ? styles.qrCellActive : styles.qrCellInactive,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <Text style={styles.qrOverlayText}>QR Code</Text>
        </View>
        <Text style={styles.qrNote}>Scan this code to send tokens to this wallet</Text>
      </View>

      {/* Address Card */}
      <View style={styles.addressCard}>
        <Text style={styles.addressLabel}>Your Address</Text>
        <Text style={styles.addressFull}>{MOCK_WALLET_ADDRESS}</Text>
        <Text style={styles.addressShort}>{shortenAddress(MOCK_WALLET_ADDRESS, 8)}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.copyButton]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>{copied ? '✓' : '📋'}</Text>
          <Text style={styles.actionButtonText}>{copied ? 'Copied!' : 'Copy Address'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Warning Note */}
      <View style={styles.warningCard}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Only send Solana assets</Text>
          <Text style={styles.warningText}>
            This address can only receive SOL and SPL tokens. Sending other assets may result in
            permanent loss.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 16,
  },
  qrGrid: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  qrRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  qrCell: {
    width: 20,
    height: 20,
    margin: 2,
    borderRadius: 2,
  },
  qrCellActive: {
    backgroundColor: '#0a0a0a',
  },
  qrCellInactive: {
    backgroundColor: '#e5e5e5',
  },
  qrOverlayText: {
    position: 'absolute',
    color: '#888888',
    fontSize: 12,
    fontWeight: '500',
  },
  qrNote: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
  },
  addressCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  addressLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressFull: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 8,
    lineHeight: 22,
  },
  addressShort: {
    color: '#8b5cf6',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#8b5cf6',
  },
  shareButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  actionIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: '#eab308',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    color: '#a3a3a3',
    fontSize: 13,
    lineHeight: 18,
  },
});
