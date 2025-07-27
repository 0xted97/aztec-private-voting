# Aztec Wallet Implementation

This project includes a comprehensive Aztec wallet implementation with the following features:

## Features

- ✅ **Create Account** - Generate and deploy new ECDSA accounts
- ✅ **Connect Account** - Connect to existing stored accounts
- ✅ **Connect Test Account** - Connect to pre-funded test accounts for development
- ✅ **Send Transaction** - Send transactions with sponsored fee payment
- ✅ **Simulate Transaction** - Simulate transactions without sending them
- ✅ **Get Balance** - Retrieve account balance
- ✅ **Account Management** - Store/retrieve accounts from localStorage
- ✅ **React Hook** - Easy integration with React/Next.js applications

## File Structure

```
src/
├── wallet-browser.ts      # Core wallet implementation (browser-compatible)
├── hooks/
│   └── useWallet.ts       # React hook for wallet functionality
├── contracts/
│   └── privateVotingContract.ts  # Contract handler for private voting
├── constants.ts           # Application constants and contract addresses
└── app/
    └── page.tsx           # Main application with integrated wallet UI
```

## Installation

The wallet uses the latest Aztec libraries and requires specific dependencies:

```bash
# Install Aztec libraries
npm install @aztec/aztec.js@latest @aztec/noir-contracts.js@latest @aztec/accounts@latest @aztec/pxe@latest @aztec/foundation@latest @aztec/stdlib@latest

# Install additional dependencies for browser compatibility
npm install buffer
```

### Next.js Configuration

Add webpack polyfills to `next.config.js` for browser compatibility:

```javascript
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      url: require.resolve('url/'),
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      assert: require.resolve('assert/'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
    };
    
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );
    
    return config;
  },
};
```

## Usage

### 1. Basic Wallet Usage

```typescript
import { wallet } from './src/wallet-browser';

// Initialize the wallet (auto-initializes on first use)
await wallet.initialize();

// Create a new account
const accountData = await wallet.createAccount();

// Connect to existing account (if stored locally)
const existingAccount = await wallet.connectAccount();

// Connect to test account for development
const testAccount = await wallet.connectTestAccount(0);

// Send a transaction
const receipt = await wallet.sendTransaction(interaction);

// Simulate a transaction
const result = await wallet.simulateTransaction(interaction);
```

### 2. React Hook Usage

```typescript
import { useWallet } from './src/hooks/useWallet';

function MyComponent() {
  const {
    walletState,
    isLoading,
    error,
    createAccount,
    connectAccount,
    connectTestAccount,
    disconnectAccount,
    sendTransaction,
    simulateTransaction,
    getBalance,
    isInitialized,
    isConnected,
  } = useWallet();

  // Wallet auto-initializes on component mount
  // Use the wallet functions
  const handleCreateAccount = async () => {
    const account = await createAccount();
    if (account) {
      console.log('Account created:', account.address);
    }
  };

  const handleConnectExisting = async () => {
    const account = await connectAccount();
    if (account) {
      console.log('Connected to:', account.address);
    }
  };

  return (
    <div>
      <p>Initialized: {isInitialized ? 'Yes' : 'No'}</p>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      {walletState.address && (
        <p>Address: {walletState.address}</p>
      )}
      <button onClick={handleCreateAccount} disabled={isLoading}>
        Create New Account
      </button>
      {walletState.account && (
        <button onClick={handleConnectExisting} disabled={isLoading}>
          Connect Existing Account
        </button>
      )}
    </div>
  );
}
```

### 3. Contract Integration

The wallet integrates with smart contracts through dedicated handlers:

```typescript
import { privateVotingContract } from './src/contracts/privateVotingContract';

// Initialize contract (registers artifact during wallet init)
await privateVotingContract.initialize();

// Cast a vote
const receipt = await privateVotingContract.castVote(candidateId);

// Get vote count (read-only)
const voteCount = await privateVotingContract.getVote(candidateId);

// Check if voting has ended
const voteEnded = await privateVotingContract.getVoteEnded();
```

### 4. Complete Application Example

The main application (`src/app/page.tsx`) demonstrates full wallet integration:

```typescript
import { useWallet } from '../hooks/useWallet';
import { privateVotingContract } from '../contracts/privateVotingContract';

export default function Home() {
  const {
    walletState,
    isLoading,
    error,
    createAccount,
    connectAccount,
    connectTestAccount,
    isInitialized,
    isConnected,
  } = useWallet();

  // Auto-initializes wallet and loads vote data
  // Provides complete voting interface with wallet integration
}
```

## API Reference

### AztecWallet Class

#### Methods

- `initialize(): Promise<void>` - Initialize wallet and connect to Aztec node
- `createAccount(): Promise<AccountData>` - Create and deploy a new account
- `connectAccount(): Promise<AccountData | null>` - Connect to stored account
- `connectTestAccount(index: number): Promise<AccountData>` - Connect to test account
- `disconnectAccount(): void` - Disconnect current account
- `sendTransaction(interaction): Promise<any>` - Send transaction with sponsored fees
- `simulateTransaction(interaction): Promise<any>` - Simulate transaction
- `getBalance(): Promise<bigint>` - Get account balance
- `registerContract(artifact, deployer, salt, args): Promise<void>` - Register contract
- `clearStoredAccount(): void` - Clear stored account data

#### Properties

- `isInitialized(): boolean` - Check if wallet is initialized
- `isConnected(): boolean` - Check if account is connected
- `getWalletState(): WalletState` - Get current wallet state

### useWallet Hook

#### Return Value

```typescript
{
  // State
  walletState: WalletState;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  createAccount: () => Promise<AccountData | null>;
  connectAccount: () => Promise<AccountData | null>;
  connectTestAccount: (index?: number) => Promise<AccountData | null>;
  disconnectAccount: () => void;
  sendTransaction: (interaction: any) => Promise<any>;
  simulateTransaction: (interaction: any) => Promise<any>;
  getBalance: () => Promise<bigint>;
  clearStoredAccount: () => void;
  
  // Utilities
  isInitialized: boolean;
  isConnected: boolean;
}
```

## Configuration

### Node URL

The wallet connects to an Aztec node. By default, it uses `http://localhost:8080`. You can change this:

```typescript
// Create wallet with custom node URL
const customWallet = new AztecWallet('https://your-aztec-node.com');

// Or use the singleton with default URL
import { wallet } from './src/wallet';
```

### Sponsored Fee Payment

The wallet uses the Sponsored FPC (Fee Payment Contract) for transaction fees, which means users don't need to pay gas fees directly.

## Security Considerations

⚠️ **Important Security Notes:**

1. **Local Storage**: Account data is stored in browser localStorage. This is NOT secure for production use.
2. **Private Keys**: Never expose private keys in production applications.
3. **Environment**: This implementation is designed for development and testing.

For production use, consider:
- Using hardware wallets
- Implementing proper key management
- Using secure storage solutions
- Adding encryption for stored data

## Development

### Running the Application

1. Start your Aztec node (default: `http://localhost:8080`)
2. Run the Next.js development server:
   ```bash
   npm run dev
   ```
3. Navigate to the main page (`http://localhost:3000`)
4. The wallet will auto-initialize and you can:
   - Create new accounts
   - Connect to existing accounts (if stored)
   - Connect to test accounts
   - Cast private votes
   - View vote results and status

### Key Features

- **Auto-Initialization**: Wallet initializes automatically on page load
- **Smart UI**: Shows appropriate buttons based on account state
- **Contract Integration**: Seamless integration with private voting contract
- **Real-time Updates**: Vote data loads and updates automatically
- **Error Handling**: Comprehensive error handling and user feedback

### Testing

The wallet includes support for test accounts that come pre-funded with tokens for development and testing purposes.

## Error Handling

The wallet includes comprehensive error handling:

- Network connection errors
- Account creation/deployment failures
- Transaction failures
- Invalid state errors

All errors are logged and can be accessed through the `error` state in the React hook.

## Examples

### Complete Workflow

```typescript
import { wallet } from './src/wallet-browser';
import { privateVotingContract } from './src/contracts/privateVotingContract';

async function completeWorkflow() {
  try {
    // 1. Initialize wallet (auto-initializes on first use)
    await wallet.initialize();
    
    // 2. Create account
    const account = await wallet.createAccount();
    console.log('Account created:', account.address);
    
    // 3. Get balance
    const balance = await wallet.getBalance();
    console.log('Balance:', balance.toString());
    
    // 4. Initialize contract
    await privateVotingContract.initialize();
    
    // 5. Cast a vote
    const receipt = await privateVotingContract.castVote(1);
    console.log('Vote cast:', receipt.txHash);
    
    // 6. Get vote count
    const voteCount = await privateVotingContract.getVote(1);
    console.log('Vote count for candidate 1:', voteCount.toString());
    
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}
```

### React Component Example

```typescript
import { useWallet } from './src/hooks/useWallet';
import { privateVotingContract } from './src/contracts/privateVotingContract';

function VotingComponent() {
  const { 
    walletState, 
    createAccount, 
    connectAccount, 
    connectTestAccount,
    isInitialized, 
    isConnected 
  } = useWallet();

  const handleVote = async (candidateId: number) => {
    if (!isConnected) {
      alert('Please connect an account first');
      return;
    }

    try {
      await privateVotingContract.initialize();
      const receipt = await privateVotingContract.castVote(candidateId);
      console.log('Vote cast successfully:', receipt.txHash);
    } catch (error) {
      console.error('Failed to cast vote:', error);
    }
  };

  return (
    <div>
      <h2>Wallet Status: {isInitialized ? 'Initialized' : 'Initializing...'}</h2>
      <h3>Connection: {isConnected ? 'Connected' : 'Disconnected'}</h3>
      
      {walletState.address && (
        <p>Address: {walletState.address}</p>
      )}
      
      {!isConnected && (
        <div>
          <button onClick={createAccount}>
            Create New Account
          </button>
          {walletState.account && (
            <button onClick={connectAccount}>
              Connect Existing Account
            </button>
          )}
          <button onClick={() => connectTestAccount(0)}>
            Connect Test Account
          </button>
        </div>
      )}
      
      {isConnected && (
        <div>
          <button onClick={() => handleVote(1)}>
            Vote for Candidate 1
          </button>
          <button onClick={() => handleVote(2)}>
            Vote for Candidate 2
          </button>
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **"Wallet not initialized"** - Call `initialize()` before using other methods
2. **"No account connected"** - Create or connect an account first
3. **Network errors** - Ensure Aztec node is running and accessible
4. **Transaction failures** - Check account balance and transaction parameters

### Debug Mode

Enable debug logging by setting the log level:

```typescript
import { createLogger } from '@aztec/aztec.js';
createLogger('wallet').setLogLevel('debug');
```

## Contributing

When contributing to this wallet implementation:

1. Follow TypeScript best practices
2. Add proper error handling
3. Include comprehensive tests
4. Update documentation
5. Consider security implications

## License

This implementation is provided as-is for educational and development purposes. 