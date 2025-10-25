// Injected script that runs in page context (has access to window.solana)

(function () {
  'use strict';

  console.log('💉 Cypherpunk injected script loaded');

  // Notify content script that injected script is ready
  window.postMessage({ type: 'CYPHERPUNK_INJECTED_READY' }, '*');

  // Listen for messages from content script
  window.addEventListener('message', async (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    const { type, data } = event.data;

    if (type === 'CYPHERPUNK_CHECK_PHANTOM') {
      const hasPhantom = !!(window.solana && window.solana.isPhantom);
      window.postMessage({
        type: 'CYPHERPUNK_PHANTOM_STATUS',
        data: { hasPhantom }
      }, '*');
    }

    if (type === 'CYPHERPUNK_CONNECT_PHANTOM') {
      try {
        if (!window.solana || !window.solana.isPhantom) {
          throw new Error('Phantom wallet not found');
        }

        await window.solana.connect();
        const publicKey = window.solana.publicKey.toString();

        window.postMessage({
          type: 'CYPHERPUNK_PHANTOM_CONNECTED',
          data: { publicKey }
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'CYPHERPUNK_PHANTOM_ERROR',
          data: { error: error.message }
        }, '*');
      }
    }

    if (type === 'CYPHERPUNK_SEND_TOKENS') {
      try {
        if (!window.solana || !window.solana.isPhantom) {
          throw new Error('Phantom wallet not found');
        }

        const { transactionBase58, rpcUrl } = data;

        console.log('Received transaction to sign');
        console.log('Requesting signature from Phantom...');

        // Helper function to decode base58
        function decodeBase58(str) {
          const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          const ALPHABET_MAP = {};
          for (let i = 0; i < ALPHABET.length; i++) {
            ALPHABET_MAP[ALPHABET[i]] = i;
          }
          
          let bytes = [0];
          for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (!(c in ALPHABET_MAP)) throw new Error('Invalid base58 character');
            
            let carry = ALPHABET_MAP[c];
            for (let j = 0; j < bytes.length; j++) {
              carry += bytes[j] * 58;
              bytes[j] = carry & 0xff;
              carry >>= 8;
            }
            
            while (carry > 0) {
              bytes.push(carry & 0xff);
              carry >>= 8;
            }
          }
          
          // Add leading zeros
          for (let i = 0; i < str.length && str[i] === '1'; i++) {
            bytes.push(0);
          }
          
          return new Uint8Array(bytes.reverse());
        }

        // Helper function to encode base58
        function encodeBase58(buffer) {
          const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          
          if (buffer.length === 0) return '';
          
          // Convert to array for easier manipulation
          const digits = [0];
          
          for (let i = 0; i < buffer.length; i++) {
            let carry = buffer[i];
            for (let j = 0; j < digits.length; j++) {
              carry += digits[j] << 8;
              digits[j] = carry % 58;
              carry = (carry / 58) | 0;
            }
            
            while (carry > 0) {
              digits.push(carry % 58);
              carry = (carry / 58) | 0;
            }
          }
          
          // Convert digits to base58 string
          let result = '';
          for (let i = digits.length - 1; i >= 0; i--) {
            result += ALPHABET[digits[i]];
          }
          
          // Add leading '1' for each leading zero byte
          for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
            result = '1' + result;
          }
          
          return result;
        }

        // Decode transaction
        const transactionBytes = decodeBase58(transactionBase58);
        
        console.log('Transaction decoded, requesting signature...');

        // Use Phantom's signTransaction to just sign (not send)
        const signedTx = await window.solana.signTransaction({
          serialize: () => transactionBytes,
          serializeMessage: () => transactionBytes,
        });

        console.log('Transaction signed, passing to content script...');

        // Send the signed transaction bytes to content script
        // Content script will forward to background script which can make RPC calls
        const signedBytes = signedTx.serialize ? signedTx.serialize() : signedTx;
        const signedBase58 = encodeBase58(signedBytes);
        
        window.postMessage({
          type: 'CYPHERPUNK_TRANSACTION_SIGNED',
          data: {
            signedTransaction: signedBase58,
            rpcUrl: rpcUrl,
            needsSending: true
          }
        }, '*');
      } catch (error) {
        console.error('Error sending tokens:', error);
        console.error('Error details:', error);
        window.postMessage({
          type: 'CYPHERPUNK_PHANTOM_ERROR',
          data: {
            error: error.message || error.toString()
          }
        }, '*');
      }
    }
  });

  // Helper to encode u64 as little-endian
  function encodeU64(value) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(value), true);
    return new Uint8Array(buffer);
  }
})();
