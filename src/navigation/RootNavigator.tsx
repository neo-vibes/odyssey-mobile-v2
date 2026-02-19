import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import {
  AgentDetailScreen,
  SessionDetailScreen,
  SendScreen,
  ReceiveScreen,
  PairAgentScreen,
  ApproveSessionScreen,
} from '../screens';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
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
        headerShadowVisible: false,
      }}
    >
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
