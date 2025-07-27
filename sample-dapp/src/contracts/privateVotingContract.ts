import { AztecAddress, Contract, Fr, getContractInstanceFromDeployParams, loadContractArtifact } from '@aztec/aztec.js';
import { PRIVATE_VOTING_CONTRACT_ADDRESS, PRIVATE_VOTING_PARAMS } from '../constants';
import EasyPrivateVotingJson from './artifacts/private_voting-EasyPrivateVoting.json';
import { wallet } from '../wallet-browser';


export class PrivateVotingContractHandler {
  private contract: Contract | null = null;
  private contractAddress: AztecAddress;

  constructor(contractAddress: string = PRIVATE_VOTING_CONTRACT_ADDRESS) {
    this.contractAddress = AztecAddress.fromString(contractAddress);
  }

  /**
   * Register the contract artifact with PXE
   * This should be called during wallet initialization
   */
  static async registerArtifact(): Promise<void> {
    try {
      const artifact = loadContractArtifact(EasyPrivateVotingJson as any);
      const pxe = wallet.getPXE();
      
      const votingContractInstance = await getContractInstanceFromDeployParams(
        artifact,
        {
          constructorArgs: [AztecAddress.fromString(PRIVATE_VOTING_PARAMS.deployer)],
          deployer: AztecAddress.fromString(PRIVATE_VOTING_PARAMS.deployer),
          salt: Fr.fromString(PRIVATE_VOTING_PARAMS.salt),
        }
      );
      votingContractInstance.address = AztecAddress.fromString(PRIVATE_VOTING_CONTRACT_ADDRESS);
      
      await pxe.registerContract({
        instance: votingContractInstance,
        artifact: artifact,
      });
      
      console.log('Private voting contract artifact registered successfully');
    } catch (error) {
      console.error('Failed to register private voting contract artifact:', error);
      // Don't throw error to prevent wallet initialization from failing
      console.warn('Continuing without private voting contract registration');
    }
  }

  /**
   * Check if the contract artifact is registered
   */
  static async isArtifactRegistered(): Promise<boolean> {
    try {
      const pxe = wallet.getPXE();
      // Try to get contracts - if it fails, artifact is not registered
      const contracts = await pxe.getContracts();
      return contracts.some(contract => contract.toString() === PRIVATE_VOTING_CONTRACT_ADDRESS);
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize the contract instance
   */
  async initialize(): Promise<void> {
    try {
      const connectedAccount = wallet.getConnectedAccount();
      if (!connectedAccount) {
        throw new Error('No account connected');
      }
      
      const artifact = loadContractArtifact(EasyPrivateVotingJson as any);
      this.contract = await Contract.at(this.contractAddress, artifact, connectedAccount);
      
      console.log('Private voting contract initialized successfully');
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      throw new Error(`Failed to initialize contract: ${error}`);
    }
  }

  /**
   * Cast a vote for a candidate
   */
  async castVote(candidateId: number): Promise<any> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    try {
      const candidateField = new Fr(candidateId);
      const interaction = this.contract.methods.cast_vote(candidateField);
      
      // Send the transaction using the wallet
      const receipt = await wallet.sendTransaction(interaction);
      return receipt;
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw new Error(`Failed to cast vote: ${error}`);
    }
  }

  /**
   * Get vote count for a candidate
   */
  async getVote(candidateId: number): Promise<bigint> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    try {
      const candidateField = new Fr(candidateId);
      const interaction = this.contract.methods.get_vote(candidateField);
      
      // Simulate the transaction to get the result
      const result = await wallet.simulateTransaction(interaction);
      
      // Extract the vote count from the result
      // The exact structure depends on the contract's return format
      return result || BigInt(0);
    } catch (error) {
      console.error('Failed to get vote:', error);
      throw new Error(`Failed to get vote: ${error}`);
    }
  }

  /**
   * Get voting end status
   */
  async getVoteEnded(): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    try {
      const interaction = this.contract.methods.get_vote_ended();
      
      // Simulate the transaction to get the result
      const result = await wallet.simulateTransaction(interaction);
      
      // Extract the boolean value from the result
      return result.value || false;
    } catch (error) {
      console.error('Failed to get vote ended status:', error);
      throw new Error(`Failed to get vote ended status: ${error}`);
    }
  }

  /**
   * Get admin address
   */
  async getAdmin(): Promise<AztecAddress> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    try {
      const interaction = this.contract.methods.get_admin();
      
      // Simulate the transaction to get the result
      const result = await wallet.simulateTransaction(interaction);
      
      // Extract the admin address from the result
      return result.value || AztecAddress.ZERO;
    } catch (error) {
      console.error('Failed to get admin:', error);
      throw new Error(`Failed to get admin: ${error}`);
    }
  }

  /**
   * Get active at block
   */
  async getActiveAtBlock(): Promise<bigint> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    try {
      const interaction = this.contract.methods.get_active_at_block();
      
      // Simulate the transaction to get the result
      const result = await wallet.simulateTransaction(interaction);
      
      // Extract the block number from the result
      return result.value || BigInt(0);
    } catch (error) {
      console.error('Failed to get active at block:', error);
      throw new Error(`Failed to get active at block: ${error}`);
    }
  }

  /**
   * End the voting (admin only)
   */
  async endVote(): Promise<any> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initialize() first.');
    }

    try {
      const interaction = this.contract.methods.end_vote();
      
      // Send the transaction using the wallet
      const receipt = await wallet.sendTransaction(interaction);
      return receipt;
    } catch (error) {
      console.error('Failed to end vote:', error);
      throw new Error(`Failed to end vote: ${error}`);
    }
  }

  /**
   * Get contract instance
   */
  getContract(): Contract | null {
    return this.contract;
  }

  /**
   * Get contract address
   */
  getContractAddress(): AztecAddress {
    return this.contractAddress;
  }
}

// Export a singleton instance
export const privateVotingContract = new PrivateVotingContractHandler(); 