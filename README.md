# Block Explorer Utilities

A collection of command-line tools for interacting with Ethereum and other EVM-compatible blockchains.

## Installation

```bash
$ npm install -g
```

## Configuration

All tools use a shared configuration file located at `~/.block-explorer-utils/config.json`. This file will be created automatically on first run with example values.

The configuration file contains:
- API keys for different blockchain networks
- RPC endpoints
- Block explorer API domains

Example configuration:
```json
{
  "current-chain": "ethereum",
  "chains": {
    "ethereum": {
      "api-key": "YOUR_INFURA_API_KEY",
      "prefix": "https://mainnet.infura.io/v3",
      "scan-api-key": "YOUR_ETHERSCAN_API_KEY",
      "scan-api-domain": "api.etherscan.io"
    },
    "polygon": {
      "api-key": "YOUR_INFURA_API_KEY",
      "prefix": "https://polygon-mainnet.infura.io/v3",
      "scan-api-key": "YOUR_POLYGONSCAN_API_KEY",
      "scan-api-domain": "api.polygonscan.com"
    }
  }
}
```

The `current-chain` field specifies which chain configuration to use by default. When you run a command with the `--chain` flag (e.g., `--chain polygon`), this value is automatically updated in your config file, making that chain the new default for future commands.

All tools support the `--chain` flag to specify which blockchain network to use. When you use this flag, the selected chain is saved as the "current-chain" in your config file, so subsequent commands will use the same chain by default until you specify a different one.

## The Tools

### `diff-contract-code`

Compare verified smart contract code deployed at two different addresses.

```bash
$ diff-contract-code <address1> <address2> [word-level-diff]
```

**Options:**
- `address1`: First contract address to compare
- `address2`: Second contract address to compare
- `word-level-diff`: Use word-level diff (true/false, defaults to true)

**Example:**
```bash
$ diff-contract-code 0x19890cf5c9a0b8d2f71eb71347d126b6f7d78b76 0x83597765904e28e3a360c17cb1f5635cbcbfdd63
```

The tool will:
1. Download verified source code for both contracts
2. Compare files that exist in both contracts
3. List files that exist in one contract but not the other
4. Show a detailed diff of the differences

### `get-contract-code`

Download verified smart contract code for a specific address.

```bash
$ get-contract-code <address>
```

**Options:**
- `address`: Contract address to get source code for

**Example:**
```bash
$ get-contract-code 0x1234abcd...
```

The tool will download all source files and save them to a directory named after the contract.

### `evm-get-storage`

Query the storage at a specific slot in a contract.

```bash
$ evm-get-storage <contract> <slot> [block]
```

**Options:**
- `contract`: Contract address to query storage from
- `slot`: Storage slot to query (hex or decimal)
- `block`: Block number or "latest" (defaults to "latest")

**Example:**
```bash
$ evm-get-storage 0x1234abcd... 0 latest
```

### `evm-get-logs-by-topic`

Get event logs from a contract filtered by a specific topic.

```bash
$ evm-get-logs-by-topic <address> <topic> [from-block] [to-block]
```

**Options:**
- `address`: Contract address to get logs for
- `topic`: Event topic hash (keccak256 of the event signature)
- `from-block`: Starting block number (defaults to 1)
- `to-block`: Ending block number or "latest" (defaults to "latest")
- `--pretty`: Pretty print the output (defaults to true)

**Example:**
```bash
$ evm-get-logs-by-topic 0x1234abcd... 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef 1000000 latest
```

### `evm-pretty`

Format large numbers with underscores for better readability, especially useful for token amounts.

```bash
$ evm-pretty <number> [decimals]
```

**Options:**
- `number`: Large number to format (can be in hex or decimal)
- `decimals`: Number of decimal places (defaults to 18)

**Example:**
```bash
$ evm-pretty 1000000000000000000 18
# Output: 1_000000000000000000
```

### `evm-to-checksum-address`

Convert Ethereum addresses to checksum format.

```bash
$ evm-to-checksum-address <addresses...>
```

**Options:**
- `addresses`: One or more Ethereum addresses to convert

**Example:**
```bash
$ evm-to-checksum-address 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
# Output: 0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### `keccak256`

Calculate the keccak256 hash of a string, useful for generating event signatures.

```bash
$ keccak256 <string>...
```

**Options:**
- `string`: One or more strings to hash with keccak256

**Example:**
```bash
$ keccak256 "transfer(address,uint256)"
# Output: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
```

## Common Features

All tools:
- Display which blockchain network they're using
- Support the `--chain` flag to specify the network (which persists between runs)
- Provide colorized output for better readability
- Include helpful error messages when configuration is missing

### Chain Selection Persistence

When you use the `--chain` flag with any command, your selection is saved to the config file as the "current-chain". This means:

1. You only need to specify `--chain` once to switch chains
2. All subsequent commands will use that chain by default
3. You can always override the current chain by using `--chain` again
4. The current chain is displayed in the output of every command

