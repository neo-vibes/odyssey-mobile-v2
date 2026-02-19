import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { RootStackScreenProps, StoredWallet } from '../types';

type Props = RootStackScreenProps<'Onboarding'>;

type OnboardingState = 'welcome' | 'creating' | 'success';

const WALLET_STORAGE_KEY = 'odyssey_wallet';

/**
 * Feature highlight component
 */
function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

/**
 * Simulates passkey wallet creation
 * TODO: Integrate real Lazorkit passkey creation
 */
async function createPasskeyWallet(): Promise<StoredWallet> {
  // Simulate passkey creation delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Generate a mock wallet (in production, this comes from Lazorkit)
  const mockPublicKey = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  )
    .join('')
    .slice(0, 44);

  const mockCredentialId = `passkey_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const wallet: StoredWallet = {
    publicKey: mockPublicKey,
    createdAt: Date.now(),
    name: 'Main Wallet',
    credentialId: mockCredentialId,
  };

  return wallet;
}

export function OnboardingScreen({ navigation }: Props) {
  const [state, setState] = useState<OnboardingState>('welcome');
  const [error, setError] = useState<string | null>(null);

  const handleCreateWallet = useCallback(async () => {
    try {
      setError(null);
      setState('creating');

      // Create wallet with passkey
      const wallet = await createPasskeyWallet();

      // Store wallet in secure storage
      await SecureStore.setItemAsync(WALLET_STORAGE_KEY, JSON.stringify(wallet));

      // Show success state
      setState('success');

      // Navigate to main after a brief delay
      setTimeout(() => {
        navigation.replace('Main', { screen: 'Wallet' });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
      setState('welcome');
    }
  }, [navigation]);

  if (state === 'creating') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingTitle}>Creating Your Wallet</Text>
          <Text style={styles.loadingSubtitle}>Setting up passkey authentication...</Text>
        </View>
      </View>
    );
  }

  if (state === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Wallet Created!</Text>
          <Text style={styles.successSubtitle}>You&apos;re all set to use Odyssey</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Branding */}
      <View style={styles.header}>
        <Text style={styles.logo}>⟁</Text>
        <Text style={styles.appName}>Odyssey</Text>
        <Text style={styles.tagline}>Your AI-Powered Wallet</Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.features}>
        <FeatureItem
          icon="🔐"
          title="Passkey Security"
          description="No seed phrases. Your wallet is secured by your device's biometrics."
        />
        <FeatureItem
          icon="🤖"
          title="Agent Sessions"
          description="Grant AI agents controlled access with time and spending limits."
        />
        <FeatureItem
          icon="⚡"
          title="Instant Transfers"
          description="Send and receive SOL and tokens with lightning speed."
        />
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Create Wallet Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateWallet}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>Create Wallet with Passkey</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    color: '#7c3aed',
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#888888',
  },
  features: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 20,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 32,
  },
  createButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#888888',
  },
  successIcon: {
    fontSize: 64,
    color: '#22c55e',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#888888',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
