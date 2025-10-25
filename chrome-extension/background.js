// Background service worker for Chrome extension

const API_BASE_URL = 'http://localhost:3000'; // Change to your production URL

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkWallet') {
    checkWalletForHandle(request.handle, request.platform)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'checkAuth') {
    checkAuthentication()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'buildTransaction') {
    buildTransaction(request.recipientWallet, request.amount, request.senderWallet)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'buildUnlinkedTransaction') {
    buildUnlinkedTransaction(request.socialHandle, request.amount, request.senderWallet)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'sendSignedTransaction') {
    sendSignedTransaction(request.signedTransaction, request.rpcUrl)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// Check if a Twitter handle has a linked wallet
async function checkWalletForHandle(handle, platform = 'twitter') {
  try {
    // Try with the handle as-is first
    let response = await fetch(
      `${API_BASE_URL}/api/social/find-wallet?handle=${encodeURIComponent(handle)}&platform=${platform}`,
      {
        credentials: 'include'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check wallet');
    }

    let data = await response.json();

    // If not found and handle starts with @, try without @
    if (!data.found && handle.startsWith('@')) {
      const handleWithoutAt = handle.substring(1);
      console.log(`Trying without @: ${handleWithoutAt}`);

      response = await fetch(
        `${API_BASE_URL}/api/social/find-wallet?handle=${encodeURIComponent(handleWithoutAt)}&platform=${platform}`,
        {
          credentials: 'include'
        }
      );

      if (response.ok) {
        data = await response.json();
      }
    }

    // If not found and handle doesn't start with @, try with @
    if (!data.found && !handle.startsWith('@')) {
      const handleWithAt = '@' + handle;
      console.log(`Trying with @: ${handleWithAt}`);

      response = await fetch(
        `${API_BASE_URL}/api/social/find-wallet?handle=${encodeURIComponent(handleWithAt)}&platform=${platform}`,
        {
          credentials: 'include'
        }
      );

      if (response.ok) {
        data = await response.json();
      }
    }

    return data;
  } catch (error) {
    console.error('Error checking wallet:', error);
    throw error;
  }
}

// Check if user is authenticated
async function checkAuthentication() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      return { authenticated: true, wallet: data.wallet };
    }

    return { authenticated: false };
  } catch (error) {
    console.error('Error checking auth:', error);
    return { authenticated: false };
  }
}

// Build transaction
async function buildTransaction(recipientWallet, amount, senderWallet) {
  const USDC_MINT = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';

  // Convert amount to smallest unit (USDC has 6 decimals)
  const amountInSmallestUnit = Math.floor(amount * 1_000_000);

  try {
    console.log('Building transaction for:', { senderWallet, recipientWallet, amount: amountInSmallestUnit });

    // Build transaction via API
    const response = await fetch(`${API_BASE_URL}/api/tokens/build-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderWallet,
        recipientWallet,
        mint: USDC_MINT,
        amount: amountInSmallestUnit,
      }),
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API error:', errorData);
      throw new Error(errorData.error || 'Failed to build transaction');
    }

    const data = await response.json();
    console.log('Transaction built:', data.message);

    return {
      transaction: data.transaction,
      message: data.message,
    };
  } catch (error) {
    console.error('Error building transaction:', error);
    throw error;
  }
}

// Build transaction for unlinked user (send to escrow)
async function buildUnlinkedTransaction(socialHandle, amount, senderWallet) {
  const USDC_MINT = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';

  // Convert amount to smallest unit (USDC has 6 decimals)
  const amountInSmallestUnit = Math.floor(amount * 1_000_000);

  try {
    console.log('Building unlinked transaction for:', { senderWallet, socialHandle, amount: amountInSmallestUnit });

    // Build transaction via API
    const response = await fetch(`${API_BASE_URL}/api/tokens/build-unlinked-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderWallet,
        socialHandle,
        mint: USDC_MINT,
        amount: amountInSmallestUnit,
      }),
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API error:', errorData);
      throw new Error(errorData.error || 'Failed to build transaction');
    }

    const data = await response.json();
    console.log('Transaction built:', data.message);

    return {
      transaction: data.transaction,
      message: data.message,
    };
  } catch (error) {
    console.error('Error building unlinked transaction:', error);
    throw error;
  }
}

// Send signed transaction
async function sendSignedTransaction(signedTransaction, rpcUrl) {
  try {
    console.log('Sending signed transaction to network...');

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: [
          signedTransaction,
          { 
            encoding: 'base58',
            skipPreflight: true, // Skip simulation to avoid duplicate detection
            maxRetries: 3
          }
        ]
      })
    });

    const result = await response.json();
    console.log('RPC response:', result);

    if (result.error) {
      throw new Error(result.error.message || 'Transaction failed');
    }

    const signature = result.result;
    console.log('Transaction sent successfully:', signature);

    return {
      signature,
      success: true,
    };
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}

// Install/update handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Cypherpunk extension installed');
    // Open welcome page
    chrome.tabs.create({ url: `${API_BASE_URL}` });
  }
});
