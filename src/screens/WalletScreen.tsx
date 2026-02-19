import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TabScreenProps, RootStackParamList } from '../types/navigation';
import type { TokenBalance } from '../types';
import { shortenAddress, formatSol } from '../services/solana';

type Props = TabScreenProps<'Wallet'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock wallet data for development
const MOCK_WALLET_ADDRESS = '7NpVxKv7z8yKPQWnqvWhcEz8xKZcvqRK9wNbK3vKz9mH';

export function WalletScreen(_props: Props) {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  // Loading state for future use when integrating with real data fetching
  const loadingState = useState(false);
  const loading = loadingState[0];
  // Balances will be updated when integrating with real wallet service
  const balancesState = useState<TokenBalance[]>([
    {
      mint: 'native',
      amount: 2_500_000_000, // 2.5 SOL in lamports
      decimals: 9,
      symbol: 'SOL',
      uiAmount: 2.5,
      logoUri: null,
    },
    {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: 100_000_000, // 100 USDC
      decimals: 6,
      symbol: 'USDC',
      uiAmount: 100,
      logoUri: null,
    },
  ]);
  const balances = balancesState[0];

  const solBalance = balances.find((b) => b.mint === 'native');
  const tokenBalances = balances.filter((b) => b.mint !== 'native');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate fetching balances
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleSend = useCallback(() => {
    navigation.navigate('Send', {});
  }, [navigation]);

  const handleReceive = useCallback(() => {
    navigation.navigate('Receive');
  }, [navigation]);

  const handleTokenPress = useCallback(
    (tokenMint: string) => {
      navigation.navigate('Send', { tokenMint });
    },
    [navigation]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8b5cf6"
          colors={['#8b5cf6']}
        />
      }
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          {solBalance ? formatSol(solBalance.amount, 4) : '0.0000'} SOL
        </Text>
        <Text style={styles.walletAddress}>{shortenAddress(MOCK_WALLET_ADDRESS)}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSend} activeOpacity={0.7}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>↑</Text>
          </View>
          <Text style={styles.actionLabel}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleReceive} activeOpacity={0.7}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>↓</Text>
          </View>
          <Text style={styles.actionLabel}>Receive</Text>
        </TouchableOpacity>
      </View>

      {/* Token List */}
      <View style={styles.tokenListContainer}>
        <Text style={styles.sectionTitle}>Tokens</Text>

        {/* SOL Token */}
        {solBalance && (
          <TouchableOpacity
            style={styles.tokenItem}
            onPress={() => handleTokenPress('native')}
            activeOpacity={0.7}
          >
            <View style={styles.tokenIcon}>
              <Text style={styles.tokenIconText}>◎</Text>
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenSymbol}>{solBalance.symbol}</Text>
              <Text style={styles.tokenName}>Solana</Text>
            </View>
            <View style={styles.tokenBalanceContainer}>
              <Text style={styles.tokenBalance}>{solBalance.uiAmount.toFixed(4)}</Text>
              <Text style={styles.tokenMint}>Native</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* SPL Tokens */}
        {tokenBalances.map((token) => (
          <TouchableOpacity
            key={token.mint}
            style={styles.tokenItem}
            onPress={() => handleTokenPress(token.mint)}
            activeOpacity={0.7}
          >
            <View style={[styles.tokenIcon, styles.tokenIconAlt]}>
              <Text style={styles.tokenIconText}>{token.symbol?.[0] || '?'}</Text>
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenSymbol}>{token.symbol || 'Unknown'}</Text>
              <Text style={styles.tokenMint}>{shortenAddress(token.mint, 4)}</Text>
            </View>
            <View style={styles.tokenBalanceContainer}>
              <Text style={styles.tokenBalance}>
                {token.uiAmount.toFixed(token.decimals > 4 ? 4 : token.decimals)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {tokenBalances.length === 0 && !solBalance && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tokens found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 24,
  },
  balanceLabel: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  walletAddress: {
    color: '#8b5cf6',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tokenListContainer: {
    flex: 1,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tokenIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tokenIconAlt: {
    backgroundColor: '#3b82f6',
  },
  tokenIconText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenName: {
    color: '#888888',
    fontSize: 13,
  },
  tokenMint: {
    color: '#666666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  tokenBalanceContainer: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
  },
});
