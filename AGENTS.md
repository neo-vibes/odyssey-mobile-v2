# AGENTS.md

## Overview

Odyssey Mobile is a React Native app for AI agent spending sessions on Solana. Users create passkey-secured wallets and approve time-limited spending sessions for their AI agents.

## Quick Start

```bash
# Install
npm install

# Run dev
npx expo start

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## Project Structure

```
src/
├── types/        # TypeScript types + Zod schemas
├── services/     # API client, Solana RPC
├── screens/      # Screen components
├── components/   # Reusable UI components
├── navigation/   # React Navigation setup
├── hooks/        # Custom hooks
└── store/        # Zustand stores
```

## Key Principles

1. **Verify your work** — Run lint, type check, test against acceptance criteria
2. **Parse at boundaries** — Validate API responses with Zod
3. **Explicit > implicit** — No magic, typed navigation
4. **TypeScript strict** — No `any`, no `!` assertions

## Tech Stack

- **Framework:** React Native + Expo
- **Navigation:** React Navigation (tabs + stacks)
- **State:** Zustand
- **Blockchain:** @solana/web3.js
- **Validation:** Zod
- **Storage:** expo-secure-store

## Code Rules

- **No `any`** — Use proper types or `unknown` with guards
- **No `console.log`** — Use proper logging if needed
- **Small components** — One component, one job
- **Colocation** — Keep styles with components
- **Dark theme** — Background #0a0a0a, accent #7c3aed

## Before Completing Task

- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] All acceptance criteria met
- [ ] No hardcoded values that should be config
- [ ] Navigation works between screens

## Common Patterns

### Screen Component
```typescript
export function MyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [state, setState] = useState<Type>(initial);
  
  // ... logic
  
  return (
    <View style={styles.container}>
      {/* content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
```

### API Call
```typescript
const response = await api.endpoint.method(params);
// Response already validated by Zod in service layer
```

### Navigation
```typescript
navigation.navigate('ScreenName', { param: value });
```

## Don't

- Don't use `any` types
- Don't skip TypeScript errors
- Don't leave TODO comments without noting in task-logs
- Don't hardcode API URLs (use env vars)
- Don't forget dark theme styles
