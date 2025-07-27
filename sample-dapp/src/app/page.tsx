'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { privateVotingContract } from '../contracts/privateVotingContract';

interface Candidate {
  id: number;
  name: string;
  votes: number;
}

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: 1, name: 'Candidate 1', votes: 0 },
    { id: 2, name: 'Candidate 2', votes: 0 },
    { id: 3, name: 'Candidate 3', votes: 0 },
    { id: 4, name: 'Candidate 4', votes: 0 },
    { id: 5, name: 'Candidate 5', votes: 0 },
  ]);
  
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [balance, setBalance] = useState<string>('');
  const [voteEnded, setVoteEnded] = useState<boolean>(false);

  // Use the real Aztec wallet
  const {
    walletState,
    isLoading,
    error,
    initialize,
    createAccount,
    connectAccount,
    connectTestAccount,
    disconnectAccount,
    getBalance,
    isInitialized,
    isConnected,
  } = useWallet();

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleInitialize = async () => {
    try {
      await initialize();
      showStatus('Wallet initialized successfully!');
    } catch (err) {
      showStatus('Failed to initialize wallet');
    }
  };

  const handleCreateAccount = async () => {
    try {
      const account = await createAccount();
      if (account) {
        showStatus('New account created and connected successfully!');
      }
    } catch (err) {
      showStatus('Failed to create account');
    }
  };

  const handleConnectAccount = async () => {
    try {
      const account = await connectAccount();
      if (account) {
        showStatus('Existing account connected successfully!');
      } else {
        showStatus('No stored account found');
      }
    } catch (err) {
      showStatus('Failed to connect account');
    }
  };

  const handleConnectTestAccount = async () => {
    try {
      const account = await connectTestAccount(0);
      if (account) {
        showStatus('Test account connected successfully!');
      }
    } catch (err) {
      showStatus('Failed to connect test account');
    }
  };

  const handleGetBalance = async () => {
    try {
      const balanceValue = await getBalance();
      setBalance(balanceValue.toString());
      showStatus('Balance retrieved successfully!');
    } catch (err) {
      showStatus('Failed to get balance');
    }
  };

  const handleDisconnect = () => {
    disconnectAccount();
    setBalance('');
    showStatus('Account disconnected');
  };

  // Load vote data from contract
  const loadVoteData = async () => {
    if (!isConnected) return;
    
    try {
      await privateVotingContract.initialize();
      
      // Load vote counts for each candidate
      const updatedCandidates = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const voteCount = await privateVotingContract.getVote(candidate.id);
            return { ...candidate, votes: Number(voteCount) };
          } catch (error) {
            console.error(`Failed to get vote for candidate ${candidate.id}:`, error);
            return candidate; // Keep existing vote count
          }
        })
      );
      
      setCandidates(updatedCandidates);
      
      // Load voting end status
      try {
        const ended = await privateVotingContract.getVoteEnded();
        setVoteEnded(ended);
      } catch (error) {
        console.error('Failed to get vote ended status:', error);
      }
      
    } catch (error) {
      console.error('Failed to load vote data:', error);
    }
  };

  // Load vote data when user connects
  useEffect(() => {
    if (isConnected) {
      loadVoteData();
    }
  }, [isConnected]);

  const handleVote = async () => {
    if (!selectedCandidate || !isConnected) {
      setStatusMessage('Please connect an account and select a candidate');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsVoting(true);
    setStatusMessage('Casting vote privately...');
    
    try {
      // Initialize the contract if not already done
      await privateVotingContract.initialize();
      
      // Cast the vote using the contract
      const receipt = await privateVotingContract.castVote(selectedCandidate);
      
      // Update local state to reflect the vote
      setCandidates(prev => 
        prev.map(candidate => 
          candidate.id === selectedCandidate 
            ? { ...candidate, votes: candidate.votes + 1 }
            : candidate
        )
      );
      
      setSelectedCandidate(null);
      setStatusMessage('Vote cast successfully! Transaction hash: ' + receipt.txHash);
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      console.error('Failed to cast vote:', error);
      setStatusMessage('Failed to cast vote: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setIsVoting(false);
    }
  };

  const toggleSecretKey = () => {
    setShowSecretKey(!showSecretKey);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Private Voting
              </h1>
              {isConnected && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${voteEnded ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {voteEnded ? 'Voting Ended' : 'Voting Active'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {walletState.address && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {walletState.address.slice(0, 6)}...{walletState.address.slice(-4)}
                </div>
              )}
              
              {!isInitialized ? (
                <button
                  onClick={handleInitialize}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {isLoading ? 'Initializing...' : 'Initialize Wallet'}
                </button>
              ) : !isConnected ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateAccount}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {isLoading ? 'Creating...' : 'Create New Account'}
                  </button>
                  {walletState.account && (
                    <button
                      onClick={handleConnectAccount}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {isLoading ? 'Connecting...' : 'Connect Account'}
                    </button>
                  )}
                  <button
                    onClick={handleConnectTestAccount}
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {isLoading ? 'Connecting...' : 'Test Account'}
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleGetBalance}
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {isLoading ? 'Loading...' : 'Balance'}
                  </button>
                  <button
                    onClick={loadVoteData}
                    disabled={isLoading}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {isLoading ? 'Loading...' : 'Refresh Votes'}
                  </button>
                  <button
                    onClick={toggleSecretKey}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {showSecretKey ? 'Hide' : 'Show'} Keys
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Status and Account Details */}
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Account Details Display */}
        {showSecretKey && walletState.account && (
          <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Account Details (Keep this safe!)
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-yellow-800 dark:text-yellow-200">Address:</span>
                <span className="ml-2 font-mono break-all">{walletState.account.address}</span>
              </div>
              <div>
                <span className="font-medium text-yellow-800 dark:text-yellow-200">Secret Key:</span>
                <span className="ml-2 font-mono break-all">{walletState.account.secretKey}</span>
              </div>
              <div>
                <span className="font-medium text-yellow-800 dark:text-yellow-200">Signing Key:</span>
                <span className="ml-2 font-mono break-all">{walletState.account.signingKey}</span>
              </div>
              <div>
                <span className="font-medium text-yellow-800 dark:text-yellow-200">Salt:</span>
                <span className="ml-2 font-mono break-all">{walletState.account.salt}</span>
              </div>
              {balance && (
                <div>
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">Balance:</span>
                  <span className="ml-2 font-mono">{balance}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vote Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Current Vote Count
              </h2>
              {voteEnded && (
                <div className="flex items-center space-x-2 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                  <span className="text-red-600 dark:text-red-300 text-sm font-medium">🗳️ Voting Ended</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-300 font-medium">
                        {candidate.id}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {candidate.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {candidate.votes}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      votes
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Voting Status Summary */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                    Voting Status
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    {voteEnded ? 'Voting period has ended' : 'Voting is currently active'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {candidates.reduce((total, candidate) => total + candidate.votes, 0)}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-300">
                    Total Votes
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Cast Your Vote
            </h2>
            
            {!isInitialized ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Please initialize the wallet to start voting
                </p>
                <button
                  onClick={handleInitialize}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-colors"
                >
                  {isLoading ? 'Initializing...' : 'Initialize Wallet'}
                </button>
              </div>
            ) : !isConnected ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {walletState.account 
                    ? 'Connect to your existing account or create a new one'
                    : 'Create a new account or use a test account to start voting'
                  }
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleCreateAccount}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-colors"
                  >
                    {isLoading ? 'Creating...' : 'Create New Account'}
                  </button>
                  {walletState.account && (
                    <button
                      onClick={handleConnectAccount}
                      disabled={isLoading}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-colors"
                    >
                      {isLoading ? 'Connecting...' : 'Connect Existing Account'}
                    </button>
                  )}
                  <button
                    onClick={handleConnectTestAccount}
                    disabled={isLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-colors"
                  >
                    {isLoading ? 'Connecting...' : 'Connect Test Account'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {voteEnded && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="text-center">
                      <p className="text-red-800 dark:text-red-200 font-medium text-lg mb-2">
                        🗳️ Voting Period Has Ended
                      </p>
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        No more votes can be cast. View the final results above.
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select a candidate:
                  </label>
                  <div className="space-y-2">
                    {candidates.map((candidate) => (
                      <label
                        key={candidate.id}
                        className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="radio"
                          name="candidate"
                          value={candidate.id}
                          checked={selectedCandidate === candidate.id}
                          onChange={(e) => setSelectedCandidate(Number(e.target.value))}
                          className="mr-3 text-blue-600"
                        />
                        <span className="text-gray-900 dark:text-white">
                          {candidate.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleVote}
                  disabled={!selectedCandidate || isVoting || isLoading || voteEnded}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-colors"
                >
                  {isVoting ? 'Casting Vote...' : voteEnded ? 'Voting Ended' : 'Vote Privately'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-200 text-center font-medium">
              {statusMessage}
            </p>
          </div>
        )}

                {/* Wallet Flow Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
            🔐 Wallet Setup Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
            <div>
              <h4 className="font-medium mb-2">First Time Users:</h4>
              <ul className="space-y-1">
                <li>• Wallet auto-initializes on page load</li>
                <li>• Click "Create New Account" to create fresh account</li>
                <li>• Account details saved locally</li>
                <li>• Ready to vote privately!</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Returning Users:</h4>
              <ul className="space-y-1">
                <li>• Wallet auto-initializes on page load</li>
                <li>• "Connect Account" button appears if account exists</li>
                <li>• Click to load existing account</li>
                <li>• Or create new account anytime</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Wallet initializes automatically. You can create new accounts or connect to existing ones. Test accounts are always available for development.
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Private Voting
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cast votes privately using zero-knowledge proofs
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Secure
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Built on Aztec's privacy-first blockchain
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-3">👁️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Transparent
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Results are publicly verifiable
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Decentralized
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No central authority controls the voting process
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
