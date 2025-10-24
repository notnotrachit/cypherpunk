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

        const { transactionBase58 } = data;

        console.log('Received transaction to sign');
        console.log('Transaction base58:', transactionBase58.substring(0, 50) + '...');
        console.log('Requesting signature from Phantom...');

        // Phantom's legacy provider expects a Transaction-like object
        // We'll create a minimal object that has the serialize method
        const transactionObject = {
          serialize: () => {
            // Decode base58 to bytes
            const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
            const ALPHABET_MAP = {};
            for (let i = 0; i < ALPHABET.length; i++) {
              ALPHABET_MAP[ALPHABET[i]] = i;
            }
            
            let bytes = [0];
            for (let i = 0; i < transactionBase58.length; i++) {
              const c = transactionBase58[i];
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
            for (let i = 0; i < transactionBase58.length && transactionBase58[i] === '1'; i++) {
              bytes.push(0);
            }
            
            return new Uint8Array(bytes.reverse());
          }
        };

        // Use Phantom's signAndSendTransaction with the transaction object
        const result = await window.solana.signAndSendTransaction(transactionObject);

        const signature = result.signature;
        console.log('Transaction sent:', signature);

        window.postMessage({
          type: 'CYPHERPUNK_TRANSACTION_SIGNED',
          data: {
            signature,
            success: true,
            message: 'Transaction sent'
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
