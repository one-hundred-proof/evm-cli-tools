# EVM CLI Tools

A collection of command-line tools for interacting with Ethereum and other EVM-compatible blockchains.

## Installation

```bash
$ npm install -g
```

## Configuration

All tools use a shared configuration file located at `~/.evm-cli-tools/config.json`. This file will be created automatically on first run with example values.

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
      "scan-api-domain": "api.etherscan.io",
      "chain-id": 1
    },
    "polygon": {
      "api-key": "YOUR_INFURA_API_KEY",
      "prefix": "https://polygon-mainnet.infura.io/v3",
      "scan-api-key": "YOUR_POLYGONSCAN_API_KEY",
      "scan-api-domain": "api.polygonscan.com",
      "chain-id": 137
    }
  }
}
```

The `current-chain` field specifies which chain configuration to use by default. When you run a command with the `--chain` flag (e.g., `--chain polygon`), this value is automatically updated in your config file, making that chain the new default for future commands.

All tools support the `--chain` flag to specify which blockchain network to use. When you use this flag, the selected chain is saved as the "current-chain" in your config file, so subsequent commands will use the same chain by default until you specify a different one.

## The Tools

### `evm-diff`

Compare verified smart contract code deployed at two different addresses.

```bash
evm-diff <address1> <address2> [word-level-diff]
```

**Options:**
- `address1`: First contract address to compare
- `address2`: Second contract address to compare
- `word-level-diff`: Use word-level diff (true/false, defaults to true)

**Example:**
```bash
evm-diff --chain ethereum 0x19890cf5c9a0b8d2f71eb71347d126b6f7d78b76 0x83597765904e28e3a360c17cb1f5635cbcbfdd63
```

The tool will:
1. Download verified source code for both contracts
2. Compare files that exist in both contracts
3. List files that exist in one contract but not the other
4. Show a detailed diff of the differences

### `evm-get-code`

Download verified smart contract code for a specific address.

```bash
evm-get-code <address>
```

**Options:**
- `address`: Contract address to get source code for

**Example:**
```bash
evm-get-code 0x1234abcd...
```

The tool will download all source files and save them to a directory named after the contract. If a proxy contract is detected, it will automatically fetch the implementation contract code as well and save it to a separate directory.

### `evm-get-storage`

Query the storage at a specific slot in a contract.

```bash
$ evm-get-storage <contract> <slot> [block]
```

**Options:**
- `contract`: Contract address to query storage from
- `slot`: Storage slot to query (hex or decimal)
- `block`: Block number or "latest" (defaults to "latest")
- `--type, -t`: Output format type (hex, decimal, address)
- `--map-key, -k`: Mapping key to encode with the slot (supports value expressions)

**Examples:**
```bash
# Get storage at slot 0
evm-get-storage 0x1234abcd... 0 latest

# Get storage at slot 0 and convert to decimal
evm-get-storage 0x1234abcd... 0 --type decimal

# Get storage for mapping at slot 0 with key 123 (treated as uint256)
evm-get-storage 0x1234abcd... 0 --map-key 123

# Get storage for mapping at slot 0 with address key
evm-get-storage 0x1234abcd... 0 --map-key "address(0x1234...)"
```

#### Solidity Expression Parser for Mapping Keys

The `--map-key` option supports Solidity-style expressions for specifying mapping keys. This allows you to query storage slots that correspond to mappings in Solidity contracts.

**Supported Expression Formats:**

1. **Plain Values** (treated as uint256):
   ```
   123
   0x123abc
   ```

2. **Typed Values**:
   ```
   uint256(123)
   int256(-10)
   address(0x1234...)
   bytes32(0x1234...)
   bool(true)
   string("Hello World")
   ```

**Type Handling:**

Each type is handled differently when encoding for storage:

- **uint256/uint**: Padded to 32 bytes (64 hex characters)
- **int256/int**: Converted to hex and padded to 32 bytes
- **address**: Lowercase and padded to 32 bytes
- **bytes32**: Ensured to have proper 32-byte padding
- **bool**: Converted to 1 (true) or 0 (false) and padded
- **string**: Converted to hex representation of ASCII bytes without padding

**String Values:**

String values must be enclosed in double quotes within the expression:

```bash
evm-get-storage 0x1234... 0 --map-key 'string("Hello World")'
```

**How Mapping Keys Work:**

In Solidity, mapping storage slots are calculated using the keccak256 hash function:

1. The key is converted to a bytes32 value according to its type
2. The storage slot number is converted to bytes32
3. These values are concatenated (key + slot)
4. The keccak256 hash of this concatenation gives the actual storage slot

For example, to access `myMapping[0x1234...]` at slot 5:

```bash
evm-get-storage 0xContractAddress 5 --map-key "address(0x1234...)"
```

**Nested Mappings:**

For nested mappings like `mapping(address => mapping(uint256 => uint256))`, you can use multiple `--map-key` flags:

```bash
# Query a nested mapping with multiple keys in one command
evm-get-storage 0xContract 5 --map-key "address(0x1234...)" --map-key 123
```

The tool will:
1. Encode the first key with the base slot (5)
2. Use the result as the slot for encoding with the second key
3. And so on for any additional levels of nesting

### `evm-get-logs-by-topic`

Get event logs from a contract filtered by a specific topic.

```bash
evm-get-logs-by-topic <address> <topic> [from-block] [to-block]
```

**Options:**
- `address`: Contract address to get logs for
- `topic`: Event topic hash (keccak256 of the event signature)
- `from-block`: Starting block number (defaults to 1)
- `to-block`: Ending block number or "latest" (defaults to "latest")
- `--pretty`: Pretty print the output (defaults to true)

**Example:**
```bash
evm-get-logs-by-topic 0x1234abcd... 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef 1000000 latest
```

### `evm-pretty`

Format large numbers with underscores for better readability, especially useful for token amounts.

```bash
evm-pretty <number> [decimals]
```

**Options:**
- `number`: Large number to format (can be in hex or decimal)
- `decimals`: Number of decimal places (defaults to 18)

**Example:**
```bash
evm-pretty 1000000000000000000 18
```

```bash
# Output: 1_000000000000000000
```

### `evm-to-checksum-address`

Convert Ethereum addresses to checksum format.

```bash
evm-to-checksum-address <addresses...>
```

**Options:**
- `addresses`: One or more Ethereum addresses to convert

**Example:**
```bash
evm-to-checksum-address 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

```bash
# Output: 0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### `evm-keccak`

Calculate the keccak256 hash of a string, useful for generating event signatures.

```bash
evm-keccak <string>...
```

**Options:**
- `string`: One or more strings to hash with keccak256

**Example:**
```bash
evm-keccak "transfer(address,uint256)"
```

```bash
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

