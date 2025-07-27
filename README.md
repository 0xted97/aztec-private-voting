# Aztec Contract Deployment Guide

This guide covers the complete process of compiling, generating code, and deploying Aztec smart contracts.

## Prerequisites

1. **Aztec CLI**: Install the Aztec CLI tool
   ```bash
   npm install -g @aztec/cli
   ```

2. **Noir Compiler**: Ensure you have the Noir compiler installed
   ```bash
   nargo --version
   ```

3. **Aztec Node**: Make sure you have an Aztec node running
   ```bash
   # Default: http://localhost:8080
   # Or use a public testnet
   ```

## Project Structure

```
private_voting/
├── src/
│   ├── main.nr              # Main Noir contract
│   └── test/
│       ├── first.nr         # Test files
│       ├── mod.nr
│       └── utils.nr
├── target/                  # Compiled artifacts
│   └── private_voting-EasyPrivateVoting.json
├── Nargo.toml              # Noir project configuration
└── README.md        # This file
```

## Step 1: Compile the Contract

Compile your Noir contract using the Aztec compiler:

```bash
# From the private_voting directory
aztec aztec-nargo compile
```

This command will:
- Compile your Noir contract (`src/main.nr`)
- Generate the compiled artifact in `target/`
- Create `private_voting-EasyPrivateVoting.json`

### Expected Output:
```
Compiling private_voting
Compiled private_voting successfully
Artifact written to target/private_voting-EasyPrivateVoting.json
```

## Step 2: Generate TypeScript Code

Generate TypeScript bindings for your compiled contract:

```bash
aztec codegen target --outdir src/artifacts
```

This command will:
- Read the compiled artifact from `target/`
- Generate TypeScript files in `src/artifacts/`
- Create contract interfaces and types

### Expected Output:
```
Generated TypeScript bindings for private_voting-EasyPrivateVoting
Files written to src/artifacts/
```

### Generated Files:
```
src/artifacts/
├── private_voting-EasyPrivateVoting.ts    # Main contract class
├── private_voting-EasyPrivateVoting.json  # Contract artifact
└── index.ts                               # Export file
```

## Step 3: Deploy the Contract

Deploy your compiled contract to the Aztec network:

```bash
aztec-wallet deploy ./target/private_voting-EasyPrivateVoting.json --from accounts:test0 --args accounts:test0
```

### Command Breakdown:
- `aztec-wallet deploy`: Deploy command
- `./target/private_voting-EasyPrivateVoting.json`: Path to compiled artifact
- `--from accounts:test0`: Deployer account (test account)
- `--args accounts:test0`: Constructor arguments (admin address)

### Expected Output:
```
Deploying private_voting-EasyPrivateVoting...
Contract deployed successfully!
Contract Address: 0x163d817a92bd156a43b214eeecae266a143a66ca801807c5a49911ae83664529
Transaction Hash: 0x23089fa11a07fc8db5d19fc8087199e16727d8cf796a3cbab92f06d7fd327f60
Deployer: 0x279acb41a60fcce801cec69b3c7b23691e34cd3adb0149af2373acc8e08b97d2
Salt: 0x2118acbfc7e15e40c7df4c8c7eb202b4ea399a0b200ad7384227f076df598d17
```

## Complete Deployment Script

Create a deployment script to automate the process:

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Starting Aztec contract deployment..."

# Step 1: Compile
echo "📦 Compiling contract..."
aztec aztec-nargo compile
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi
echo "✅ Compilation successful"

# Step 2: Generate TypeScript code
echo "🔧 Generating TypeScript bindings..."
aztec codegen target --outdir src/artifacts
if [ $? -ne 0 ]; then
    echo "❌ Code generation failed"
    exit 1
fi
echo "✅ TypeScript bindings generated"

# Step 3: Deploy
echo "🚀 Deploying contract..."
aztec-wallet deploy ./target/private_voting-EasyPrivateVoting.json --from accounts:test0 --args accounts:test0
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi
echo "✅ Deployment successful"

echo "🎉 Contract deployment completed!"
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Configuration Files

### Nargo.toml
```toml
[package]
name = "private_voting"
type = "contract"
authors = [""]
compiler_version = ">=0.19.0"

[dependencies]
aztec = { git = "https://github.com/AztecProtocol/aztec-packages", tag = "aztec-0.19.0" }

[contracts]
private_voting = "src/main.nr"
```

### Contract Configuration
After deployment, update your constants file:

```typescript
// src/constants.ts
export const PRIVATE_VOTING_CONTRACT_ADDRESS = "0x163d817a92bd156a43b214eeecae266a143a66ca801807c5a49911ae83664529";

export const PRIVATE_VOTING_PARAMS = {
    salt: "0x2118acbfc7e15e40c7df4c8c7eb202b4ea399a0b200ad7384227f076df598d17",
    txHash: "0x23089fa11a07fc8db5d19fc8087199e16727d8cf796a3cbab92f06d7fd327f60",
    deployer: "0x279acb41a60fcce801cec69b3c7b23691e34cd3adb0149af2373acc8e08b97d2",
    initHash: "0x0696900018e2a412c3e8fafff6a69d6a7feafa04f4b98ad86cf6036064e7fa89"
};
```

## Account Management

### List Available Accounts
```bash
aztec-wallet list-accounts
```

### Create Test Account
```bash
aztec-wallet create-account --name test0
```

### Get Account Info
```bash
aztec-wallet get-account accounts:test0
```

### Fund Account (if needed)
```bash
aztec-wallet fund accounts:test0 --amount 1000000
```

## Troubleshooting

### Common Issues

1. **Compilation Errors**
   ```bash
   # Check Noir version
   nargo --version
   
   # Clean and recompile
   nargo clean
   aztec aztec-nargo compile
   ```

2. **Deployment Failures**
   ```bash
   # Check account balance
   aztec-wallet get-balance accounts:test0
   
   # Check node connection
   curl http://localhost:8080/status
   ```

3. **Code Generation Issues**
   ```bash
   # Verify artifact exists
   ls -la target/private_voting-EasyPrivateVoting.json
   
   # Regenerate with verbose output
   aztec codegen target --outdir src/artifacts --verbose
   ```

### Error Messages

- **"Contract already deployed"**: Use different salt or update existing contract
- **"Insufficient balance"**: Fund the deployer account
- **"Invalid constructor args"**: Check contract constructor parameters
- **"Node connection failed"**: Verify Aztec node is running

## Environment Setup

### Development Environment
```bash
# Local development
export AZTEC_NODE_URL=http://localhost:8080
export AZTEC_PRIVATE_KEY=your_private_key_here
```

### Testnet Deployment
```bash
# Testnet configuration
export AZTEC_NODE_URL=https://testnet.aztec.network
export AZTEC_PRIVATE_KEY=your_testnet_private_key
```

## Verification

### Verify Deployment
```bash
# Check contract on explorer
aztec-wallet verify-contract 0x163d817a92bd156a43b214eeecae266a143a66ca801807c5a49911ae83664529
```

### Test Contract Functions
```bash
# Test read function
aztec-wallet call 0x163d817a92bd156a43b214eeecae266a143a66ca801807c5a49911ae83664529 get_vote_ended --from accounts:test0

# Test write function
aztec-wallet call 0x163d817a92bd156a43b214eeecae266a143a66ca801807c5a49911ae83664529 cast_vote 1 --from accounts:test0
```

## Best Practices

1. **Version Control**: Always commit your compiled artifacts
2. **Environment Separation**: Use different accounts for dev/test/prod
3. **Documentation**: Keep deployment addresses and parameters documented
4. **Testing**: Test contracts thoroughly before deployment
5. **Backup**: Keep backup of private keys and deployment parameters

## Next Steps

After successful deployment:

1. **Update Constants**: Update contract addresses in your application
2. **Test Integration**: Test contract integration in your dApp
3. **Monitor**: Monitor contract usage and performance
4. **Upgrade**: Plan for future contract upgrades if needed

## Support

For issues and questions:
- [Aztec Documentation](https://docs.aztec.network/)
- [Aztec Discord](https://discord.gg/aztec)
- [GitHub Issues](https://github.com/AztecProtocol/aztec-packages/issues) 