import web3 from 'web3';

/**
 * Parse a Solidity-style value expression
 * Supports formats like:
 * - Plain value (treated as uint256): "123", "0x123"
 * - Typed value: "address(0x123)", "bytes32(0x123)", etc.
 * - String values with quotes: 'string("hello world")'
 *
 * @param {string} expression - The expression to parse
 * @returns {Object} Object with type and value properties
 */
export function parseSolidityExpression(expression) {
  // Check if it's a typed expression
  const typeMatch = expression.match(/^([a-z0-9]+)\((.*)\)$/i);

  if (typeMatch) {
    const type = typeMatch[1].toLowerCase();
    let value = typeMatch[2];

    // Validate supported types
    const supportedTypes = ['uint256', 'int256', 'address', 'bytes32', 'string', 'bool'];
    if (!supportedTypes.includes(type)) {
      throw new Error(`Unsupported type: ${type}. Supported types are: ${supportedTypes.join(', ')}`);
    }

    // Handle quoted strings for string type
    if (type === 'string' && value.startsWith('"') && value.endsWith('"')) {
      // Remove the surrounding quotes
      value = value.substring(1, value.length - 1);
    }

    return { type, value };
  }

  // If no type specified, default to uint256
  return { type: 'uint256', value: expression };
}

/**
 * Convert a value to bytes32 hex format based on its type
 *
 * @param {Object} parsedExpr - Object with type and value properties
 * @returns {string} Bytes32 hex representation
 */
export function convertToBytes32(parsedExpr) {
  const { type, value } = parsedExpr;


  switch (type) {
    case 'uint256':
    case 'uint':
      // Handle both decimal and hex inputs
      if (value.startsWith('0x')) {
        return web3.utils.padLeft(value, 64);
      } else {
        return web3.utils.padLeft(web3.utils.numberToHex(value), 64);
      }

    case 'int256':
    case 'int':
      // Convert to hex and pad
      return web3.utils.padLeft(web3.utils.numberToHex(value), 64);

    case 'address':
      // Addresses are padded to 32 bytes (64 hex chars)
      return web3.utils.padLeft(value.toLowerCase(), 64);

    case 'bytes32':
      // Already bytes32, just ensure proper padding
      return web3.utils.padLeft(value, 64);

    case 'bool':
      // true = 1, false = 0
      let lcVal = value.toLowerCase()
      return web3.utils.padLeft((lcVal === 'true' ||  lcVal == "1") ? '0x1' : '0x0', 64);

    case 'string':
      // Convert string to hex representation of its bytes
      let hexString = '';
      for (let i = 0; i < value.length; i++) {
        const hexChar = value.charCodeAt(i).toString(16);
        hexString += hexChar;
      }
      // No padding for strings - return as is
      return '0x' + hexString;

    default:
      throw new Error(`Conversion for type ${type} not implemented`);
  }
}

/**
 * Encode a storage slot with a mapping key
 *
 * @param {string} slot - The storage slot (decimal or hex)
 * @param {string} key - The mapping key expression
 * @returns {string} The encoded storage slot
 */
/**
 * Parse a slot value into bytes32 hex format
 * If there is no leading 0x, treat as decimal
 * Otherwise treat as hex and pad to 64 hex chars
 *
 * @param {string|number} slot - The slot value to parse
 * @returns {string} The slot as a bytes32 hex string
 */
export function parseSlotToBytes32(slot) {
  // Convert to string if it's a number
  const slotStr = String(slot);
  
  // If it starts with 0x, treat as hex
  if (slotStr.startsWith('0x')) {
    return web3.utils.padLeft(slotStr, 64);
  } 
  // Otherwise treat as decimal
  else {
    return web3.utils.padLeft(web3.utils.numberToHex(slotStr), 64);
  }
}

/**
 * Increment a bytes32 hex string by a given amount
 *
 * @param {string} bytes32Hex - The bytes32 hex string to increment
 * @param {number} increment - The amount to increment by
 * @returns {string} The incremented bytes32 hex string
 */
export function incrementBytes32HexStr(bytes32Hex, increment = 1) {
  const slotBigInt = BigInt(bytes32Hex) + BigInt(increment);
  return '0x' + slotBigInt.toString(16).padStart(64, '0');
}

export function encodeStorageSlot(slot, key) {
  // Parse the key expression
  const parsedKey = parseSolidityExpression(key);

  // Convert slot to bytes32 hex
  const slotHex = parseSlotToBytes32(slot);

  // Convert key to bytes32 hex
  const keyHex = convertToBytes32(parsedKey);

  // Remove 0x prefixes
  const slotHexWithoutPrefix = slotHex.startsWith('0x') ? slotHex.slice(2) : slotHex;
  const keyHexWithoutPrefix = keyHex.startsWith('0x') ? keyHex.slice(2) : keyHex;

  // Concatenate and hash
  const concatenated = `0x${keyHexWithoutPrefix}${slotHexWithoutPrefix}`;
  return web3.utils.keccak256(concatenated);
}
