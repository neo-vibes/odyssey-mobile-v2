import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

/**
 * Root Stack Navigator param list
 * Contains both tab navigator and detail screens
 */
export type RootStackParamList = {
  // Tab Navigator (main bottom tabs)
  Main: NavigatorScreenParams<TabParamList>;

  // Detail Screens
  AgentDetail: { agentId: string };
  SessionDetail: { sessionId: string };
  Send: { tokenMint?: string };
  Receive: undefined;
  PairAgent: undefined;
  ApproveSession: { requestId: string };
};

/**
 * Bottom Tab Navigator param list
 */
export type TabParamList = {
  Wallet: undefined;
  Agents: undefined;
  Settings: undefined;
};

/**
 * Screen props for Root Stack screens
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/**
 * Screen props for Tab screens
 */
export type TabScreenProps<T extends keyof TabParamList> = BottomTabScreenProps<TabParamList, T>;

/**
 * Declaration merge for useNavigation type safety
 * This pattern is required by React Navigation for type-safe navigation
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // This empty interface is intentional - it's the React Navigation pattern
    // for enabling type-safe useNavigation hooks
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
