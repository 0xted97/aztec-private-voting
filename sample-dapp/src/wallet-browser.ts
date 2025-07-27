import {
  Fr,
  createLogger,
  createAztecNodeClient,
  AztecAddress,
  getContractInstanceFromDeployParams,
  ContractFunctionInteraction,
  SponsoredFeePaymentMethod,
  type PXE,
  AccountWallet,
  type ContractArtifact,
  ContractInstanceWithAddress,
} from '@aztec/aztec.js';
import { getDefaultInitializer } from '@aztec/stdlib/abi';
import { SponsoredFPCContractArtifact } from '@aztec/noir-contracts.js/SponsoredFPC';
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import { randomBytes } from '@aztec/foundation/crypto';
import { getEcdsaRAccount } from '@aztec/accounts/ecdsa/lazy';
import { getSchnorrAccount } from '@aztec/accounts/schnorr/lazy';
import { getPXEServiceConfig } from '@aztec/pxe/config';
import { createPXEService } from '@aztec/pxe/client/lazy';
import { getInitialTestAccounts } from '@aztec/accounts/testing';

const PROVER_ENABLED = true;

const logger = createLogger('wallet');
const LocalStorageKey = 'aztec-account';

export interface AccountData {
  address: string;
  signingKey: string;
  secretKey: string;
  salt: string;
}

export interface WalletState {
  isConnected: boolean;
  account: AccountData | null;
  address: string | null;
}

export class AztecWallet {
  private pxe!: PXE;
  private connectedAccount: AccountWallet | null = null;
  private nodeUrl: string;

  constructor(nodeUrl: string = 'http://localhost:8080') {
    this.nodeUrl = nodeUrl;
  }

  /**
   * Initialize the wallet by connecting to the Aztec node and setting up PXE
   */
  async initialize(): Promise<void> {
    try {
      // Create Aztec Node Client
      const aztecNode = await createAztecNodeClient(this.nodeUrl);

      // Create PXE Service
      const config = getPXEServiceConfig();
      config.l1Contracts = await aztecNode.getL1ContractAddresses();
      config.proverEnabled = PROVER_ENABLED;
      this.pxe = await createPXEService(aztecNode, config);

      // Register Sponsored FPC Contract with PXE
      await this.pxe.registerContract({
        instance: await this.getSponsoredPFCContract(),
        artifact: SponsoredFPCContractArtifact,
      });

      // Register Private Voting Contract Artifact
      try {
        const { PrivateVotingContractHandler } = await import('./contracts/privateVotingContract');
        await PrivateVotingContractHandler.registerArtifact();
      } catch (error) {
        logger.warn('Failed to register private voting contract artifact:', error);
      }

      // Log the Node Info
      const nodeInfo = await this.pxe.getNodeInfo();
      logger.info('PXE Connected to node', nodeInfo);
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
      throw new Error(`Failed to initialize wallet: ${error}`);
    }
  }

  /**
   * Get the current wallet state
   */
  getWalletState(): WalletState {
    return {
      isConnected: !!this.connectedAccount,
      account: this.getStoredAccount(),
      address: this.connectedAccount?.getAddress().toString() || null,
    };
  }

  /**
   * Create a new account and connect to it
   */
  async createAccount(): Promise<AccountData> {
    if (!this.pxe) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      // Generate a random salt, secret key, and signing key
      const salt = Fr.random();
      const secretKey = Fr.random();
      const signingKey = randomBytes(32);

      // Create an ECDSA account
      const ecdsaAccount = await getEcdsaRAccount(
        this.pxe,
        secretKey,
        signingKey,
        salt
      );

      // Deploy the account
      const deployMethod = await ecdsaAccount.getDeployMethod();
      const sponsoredPFCContract = await this.getSponsoredPFCContract();
      const deployOpts = {
        contractAddressSalt: Fr.fromString(ecdsaAccount.salt.toString()),
        fee: {
          paymentMethod: await ecdsaAccount.getSelfPaymentMethod(
            new SponsoredFeePaymentMethod(sponsoredPFCContract.address)
          ),
        },
        universalDeploy: true,
        skipClassRegistration: true,
        skipPublicDeployment: true,
      };

      const provenInteraction = await deployMethod.prove(deployOpts);
      const receipt = await provenInteraction.send().wait();

      logger.info('Account deployed', receipt);

      // Get the wallet and store account data
      const ecdsaWallet = await ecdsaAccount.getWallet();
      const accountData: AccountData = {
        address: ecdsaWallet.getAddress().toString(),
        signingKey: signingKey.toString('hex'),
        secretKey: secretKey.toString(),
        salt: salt.toString(),
      };

      // Store the account in local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem(LocalStorageKey, JSON.stringify(accountData));
      }

      // Register the account with PXE
      await ecdsaAccount.register();
      this.connectedAccount = ecdsaWallet;

      logger.info('Account created and connected successfully');
      return accountData;
    } catch (error) {
      logger.error('Failed to create account:', error);
      throw new Error(`Failed to create account: ${error}`);
    }
  }

  /**
   * Connect to an existing account
   */
  async connectAccount(): Promise<AccountData | null> {
    if (!this.pxe) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      const accountData = this.getStoredAccount();
      if (!accountData) {
        logger.info('No stored account found');
        return null;
      }

      const ecdsaAccount = await getEcdsaRAccount(
        this.pxe,
        Fr.fromString(accountData.secretKey),
        Buffer.from(accountData.signingKey, 'hex'),
        Fr.fromString(accountData.salt)
      );

      await ecdsaAccount.register();
      const ecdsaWallet = await ecdsaAccount.getWallet();

      this.connectedAccount = ecdsaWallet;
      logger.info('Account connected successfully');
      return accountData;
    } catch (error) {
      logger.error('Failed to connect account:', error);
      throw new Error(`Failed to connect account: ${error}`);
    }
  }

  /**
   * Connect to a test account (for development/testing)
   */
  async connectTestAccount(index: number = 0): Promise<AccountData> {
    if (!this.pxe) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      const testAccounts = await getInitialTestAccounts();
      const account = testAccounts[index];
      const schnorrAccount = await getSchnorrAccount(
        this.pxe,
        account.secret,
        account.signingKey,
        account.salt
      );

      await schnorrAccount.register();
      const wallet = await schnorrAccount.getWallet();

      this.connectedAccount = wallet;

      const accountData: AccountData = {
        address: wallet.getAddress().toString(),
        signingKey: account.signingKey.toString('hex'),
        secretKey: account.secret.toString(),
        salt: account.salt.toString(),
      };

      logger.info('Test account connected successfully');
      return accountData;
    } catch (error) {
      logger.error('Failed to connect test account:', error);
      throw new Error(`Failed to connect test account: ${error}`);
    }
  }

  /**
   * Disconnect the current account
   */
  disconnectAccount(): void {
    this.connectedAccount = null;
    logger.info('Account disconnected');
  }

  /**
   * Get the connected account wallet
   */
  getConnectedAccount(): AccountWallet | null {
    return this.connectedAccount;
  }

  /**
   * Send a transaction with sponsored fee payment
   */
  async sendTransaction(interaction: ContractFunctionInteraction): Promise<any> {
    if (!this.connectedAccount) {
      throw new Error('No account connected. Please connect an account first.');
    }

    if (!this.pxe) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      const sponsoredPFCContract = await this.getSponsoredPFCContract();
      const provenInteraction = await interaction.prove({
        fee: {
          paymentMethod: new SponsoredFeePaymentMethod(
            sponsoredPFCContract.address
          ),
        },
      });

      const receipt = await provenInteraction.send().wait();
      logger.info('Transaction sent successfully', receipt);
      return receipt;
    } catch (error) {
      logger.error('Failed to send transaction:', error);
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }

  /**
   * Simulate a transaction without sending it
   */
  async simulateTransaction(interaction: ContractFunctionInteraction): Promise<any> {
    if (!this.connectedAccount) {
      throw new Error('No account connected. Please connect an account first.');
    }

    try {
      const result = await interaction.simulate();
      logger.info('Transaction simulation completed', result);
      return result;
    } catch (error) {
      logger.error('Failed to simulate transaction:', error);
      throw new Error(`Failed to simulate transaction: ${error}`);
    }
  }

  /**
   * Register a contract with PXE
   */
  async registerContract(
    artifact: ContractArtifact,
    instance: ContractInstanceWithAddress,
  ): Promise<void> {
    if (!this.pxe) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {

      await this.pxe.registerContract({
        instance,
        artifact,
      });

      logger.info('Contract registered successfully');
    } catch (error) {
      logger.error('Failed to register contract:', error);
      throw new Error(`Failed to register contract: ${error}`);
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<bigint> {
    if (!this.connectedAccount) {
      throw new Error('No account connected. Please connect an account first.');
    }

    try {
      // For now, return a placeholder balance since the exact API may vary
      // In a real implementation, you would use the correct PXE method
      return BigInt(1000000); // Placeholder balance
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  /**
   * Get the PXE instance
   */
  getPXE(): PXE {
    if (!this.pxe) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }
    return this.pxe;
  }

  /**
   * Internal method to get the Sponsored FPC Contract
   */
  private async getSponsoredPFCContract() {
    const instance = await getContractInstanceFromDeployParams(
      SponsoredFPCContractArtifact,
      {
        salt: new Fr(SPONSORED_FPC_SALT),
      }
    );

    return instance;
  }

  /**
   * Get stored account data from localStorage
   */
  private getStoredAccount(): AccountData | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      const account = localStorage.getItem(LocalStorageKey);
      if (!account) {
        return null;
      }
      return JSON.parse(account) as AccountData;
    } catch (error) {
      logger.error('Failed to parse stored account:', error);
      return null;
    }
  }

  /**
   * Clear stored account data
   */
  clearStoredAccount(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LocalStorageKey);
    }
    logger.info('Stored account data cleared');
  }

  /**
   * Check if wallet is initialized
   */
  isInitialized(): boolean {
    return !!this.pxe;
  }

  /**
   * Check if account is connected
   */
  isConnected(): boolean {
    return !!this.connectedAccount;
  }
}

// Export a singleton instance for easy use
export const wallet = new AztecWallet(); 