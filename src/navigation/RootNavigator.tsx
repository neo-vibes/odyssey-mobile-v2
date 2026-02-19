import { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { TabNavigator } from './TabNavigator';
import {
  OnboardingScreen,
  AgentDetailScreen,
  SessionDetailScreen,
  SendScreen,
  ReceiveScreen,
  PairAgentScreen,
  ApproveSessionScreen,
} from '../screens';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const WALLET_STORAGE_KEY = 'odyssey_wallet';

export function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    async function checkWallet() {
      try {
        const wallet = await SecureStore.getItemAsync(WALLET_STORAGE_KEY);
        setHasWallet(wallet !== null);
      } catch {
        // If error reading storage, assume no wallet
        setHasWallet(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkWallet();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={hasWallet ? 'Main' : 'Onboarding'}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a0a0a',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: '#0a0a0a',
        },
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="AgentDetail"
        component={AgentDetailScreen}
        options={{ title: 'Agent Details' }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Session Details' }}
      />
      <Stack.Screen name="Send" component={SendScreen} options={{ title: 'Send' }} />
      <Stack.Screen name="Receive" component={ReceiveScreen} options={{ title: 'Receive' }} />
      <Stack.Screen
        name="PairAgent"
        component={PairAgentScreen}
        options={{ title: 'Pair Agent' }}
      />
      <Stack.Screen
        name="ApproveSession"
        component={ApproveSessionScreen}
        options={{ title: 'Approve Session' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
