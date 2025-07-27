import { useState, useEffect, useCallback } from 'react';
import { wallet, type AccountData, type WalletState } from '../wallet-browser';

export interface UseWalletReturn {
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

export function useWallet(): UseWalletReturn {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    account: null,
    address: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update wallet state
  const updateWalletState = useCallback(() => {
    setWalletState(wallet.getWalletState());
  }, []);

  // Initialize wallet
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await wallet.initialize();
      updateWalletState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize wallet';
      setError(errorMessage);
      console.error('Wallet initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updateWalletState]);

  // Create account
  const createAccount = useCallback(async (): Promise<AccountData | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const accountData = await wallet.createAccount();
      updateWalletState();
      return accountData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      console.error('Create account error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [updateWalletState]);

  // Connect account
  const connectAccount = useCallback(async (): Promise<AccountData | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const accountData = await wallet.connectAccount();
      updateWalletState();
      return accountData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect account';
      setError(errorMessage);
      console.error('Connect account error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [updateWalletState]);

  // Connect test account
  const connectTestAccount = useCallback(async (index: number = 0): Promise<AccountData | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const accountData = await wallet.connectTestAccount(index);
      updateWalletState();
      return accountData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect test account';
      setError(errorMessage);
      console.error('Connect test account error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [updateWalletState]);

  // Disconnect account
  const disconnectAccount = useCallback(() => {
    wallet.disconnectAccount();
    updateWalletState();
    setError(null);
  }, [updateWalletState]);

  // Send transaction
  const sendTransaction = useCallback(async (interaction: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await wallet.sendTransaction(interaction);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      console.error('Send transaction error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simulate transaction
  const simulateTransaction = useCallback(async (interaction: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await wallet.simulateTransaction(interaction);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to simulate transaction';
      setError(errorMessage);
      console.error('Simulate transaction error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get balance
  const getBalance = useCallback(async (): Promise<bigint> => {
    try {
      const balance = await wallet.getBalance();
      return balance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get balance';
      setError(errorMessage);
      console.error('Get balance error:', err);
      throw err;
    }
  }, []);

  // Clear stored account
  const clearStoredAccount = useCallback(() => {
    wallet.clearStoredAccount();
    updateWalletState();
    setError(null);
  }, [updateWalletState]);

  // Auto-initialize wallet on first load
  useEffect(() => {
    const autoInitialize = async () => {
      if (!wallet.isInitialized()) {
        try {
          await initialize();
        } catch (error) {
          console.error('Auto-initialization failed:', error);
        }
      }
    };
    
    autoInitialize();
  }, [initialize]);

  return {
    // State
    walletState,
    isLoading,
    error,
    
    // Actions
    initialize,
    createAccount,
    connectAccount,
    connectTestAccount,
    disconnectAccount,
    sendTransaction,
    simulateTransaction,
    getBalance,
    clearStoredAccount,
    
    // Utilities
    isInitialized: wallet.isInitialized(),
    isConnected: wallet.isConnected(),
  };
} 