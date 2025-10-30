// Content script for Twitter/X integration

const API_BASE_URL = "https://rivo.rcht.dev";
let processedProfiles = new Set();

// Inject script into page context to access window.solana
function injectScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from injected script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const { type, data } = event.data;

  if (type === "CYPHERPUNK_PHANTOM_STATUS") {
    window.cypherpunkPhantomStatus = data;
  }

  if (type === "CYPHERPUNK_PHANTOM_CONNECTED") {
    window.cypherpunkPhantomConnected = data;
    try {
      // Re-run to attempt adding the badge now that Phantom is connected
      processedProfiles.clear();
      setTimeout(() => {
        processCurrentPage();
      }, 0);
    } catch (_) {}
  }

  if (type === "CYPHERPUNK_TRANSACTION_SIGNED") {
    window.cypherpunkTransactionSigned = data;
  }

  if (type === "CYPHERPUNK_PHANTOM_ERROR") {
    window.cypherpunkPhantomError = data;
  }

  if (type === "CYPHERPUNK_PHANTOM_CONNECTION_STATUS") {
    window.cypherpunkPhantomConnStatus = data;
  }
});

// Initialize
init();

function init() {
  // Inject script to access Phantom
  injectScript();

  // Watch for profile changes (Twitter is a SPA)
  observeProfileChanges();

  // Process current page after a delay
  setTimeout(() => {
    processCurrentPage();
  }, 2000);
}

// Observe DOM changes for Twitter's dynamic content
function observeProfileChanges() {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;

    // Only process if URL changed (navigation happened)
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // Clear processed profiles on navigation
      processedProfiles.clear();

      // Wait for page to load
      setTimeout(() => {
        processCurrentPage();
      }, 2000);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Check authentication and Phantom connection status before showing the badge
async function prerequisitesMet() {
  // Check auth via background script
  try {
    const auth = await chrome.runtime.sendMessage({ action: "checkAuth" });
    if (!auth || !auth.authenticated) return false;
  } catch (e) {
    return false;
  }

  // Check Phantom connection (only if previously trusted) via injected script
  window.cypherpunkPhantomConnStatus = undefined;
  window.postMessage({ type: "CYPHERPUNK_CHECK_PHANTOM_CONNECTION" }, "*");

  const status = await new Promise((resolve) => {
    let waited = 0;
    const iv = setInterval(() => {
      if (window.cypherpunkPhantomConnStatus) {
        clearInterval(iv);
        resolve(window.cypherpunkPhantomConnStatus);
      } else {
        waited += 100;
        if (waited >= 1500) {
          clearInterval(iv);
          resolve({ connected: false });
        }
      }
    }, 100);
  });

  return !!status.connected;
}

// Process the current page
async function processCurrentPage() {
  // Check if we're on a profile page
  const isProfilePage = window.location.pathname.match(/^\/[^\/]+$/);

  if (isProfilePage) {
    const handle = extractTwitterHandle();

    if (handle && !processedProfiles.has(handle)) {
      const ready = await prerequisitesMet();
      if (!ready) {
        return;
      }
      processedProfiles.add(handle);
      await checkAndAddSolanaButton(handle);
    }
  }

  // Also check for profile cards in timeline
}

// Extract Twitter handle from profile page
function extractTwitterHandle() {
  // First try: extract from URL (most reliable for profile pages)
  const match = window.location.pathname.match(/^\/([^\/]+)/);
  if (
    match &&
    match[1] !== "home" &&
    match[1] !== "explore" &&
    match[1] !== "notifications" &&
    match[1] !== "search"
  ) {
    const handle = "@" + match[1];
    return handle;
  }

  // Fallback: Try specific selectors for the profile header
  const selectors = [
    '[data-testid="UserName"] span:first-child', // More specific selector for the actual username
    '[data-testid="UserProfileHeader_Items"] span[dir="ltr"]', // Profile header username
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const el of elements) {
      const text = el.textContent;
      if (
        text &&
        text.startsWith("@") &&
        !text.includes(" ") &&
        text.length > 1
      ) {
        return text.trim();
      }
    }
  }
  return null;
}

// Check wallet and add Solana button
async function checkAndAddSolanaButton(handle) {
  try {
    // Check if wallet is linked
    const result = await chrome.runtime.sendMessage({
      action: "checkWallet",
      handle: handle,
      platform: "twitter",
    });

    if (result.error) {
      console.error("❌ Error checking wallet:", result.error);
      // Still show button even if there's an error
      addSolanaButton(handle, null);
      return;
    }

    if (result.found) {
      addSolanaButton(handle, result.wallet);
    } else {
      // Show button anyway, will use send_to_unlinked flow
      addSolanaButton(handle, null);
    }
  } catch (error) {
    console.error("❌ Error in checkAndAddSolanaButton:", error);
    // Still show button even if there's an error
    addSolanaButton(handle, null);
  }
}

// Add Solana Pay button to profile
function addSolanaButton(handle, walletAddress) {
  // Check if button already exists
  if (document.getElementById("cypherpunk-solana-btn")) {
    return;
  }

  // Find the UserName container (has the name and blue tick)
  const userNameContainer = document.querySelector('[data-testid="UserName"]');

  if (!userNameContainer) {
    return;
  }

  // Find the row that contains the name and verified badge
  const nameRow = userNameContainer.querySelector(
    ".css-175oi2r.r-1awozwy.r-18u37iz.r-dnmrzs",
  );

  if (!nameRow) {
    return;
  }

  // Create Send Money button (pill style with Solana logo)
  const badge = document.createElement("button");
  badge.id = "cypherpunk-solana-btn";
  badge.className = "cypherpunk-send-btn";
  badge.setAttribute("aria-label", "Send Money");
  badge.setAttribute("type", "button");
  badge.setAttribute("title", "Send Money");
  badge.innerHTML = `
    ${walletAddress ? `
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9945FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#14F195;stop-opacity:1" />
        </linearGradient>
      </defs>
    </svg>
    ` : ''}
    <span class="cypherpunk-send-icon ${walletAddress ? 'cypherpunk-send-icon-gradient' : ''}" aria-hidden="true">
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
        <title>Solana</title>
        <path d="m23.8764 18.0313-3.962 4.1393a.9201.9201 0 0 1-.306.2106.9407.9407 0 0 1-.367.0742H.4599a.4689.4689 0 0 1-.2522-.0733.4513.4513 0 0 1-.1696-.1962.4375.4375 0 0 1-.0314-.2545.4438.4438 0 0 1 .117-.2298l3.9649-4.1393a.92.92 0 0 1 .3052-.2102.9407.9407 0 0 1 .3658-.0746H23.54a.4692.4692 0 0 1 .2523.0734.4531.4531 0 0 1 .1697.196.438.438 0 0 1 .0313.2547.4442.4442 0 0 1-.1169.2297zm-3.962-8.3355a.9202.9202 0 0 0-.306-.2106.941.941 0 0 0-.367-.0742H.4599a.4687.4687 0 0 0-.2522.0734.4513.4513 0 0 0-.1696.1961.4376.4376 0 0 0-.0314.2546.444.444 0 0 0 .117.2297l3.9649 4.1394a.9204.9204 0 0 0 .3052.2102c.1154.049.24.0744.3658.0746H23.54a.469.469 0 0 0 .2523-.0734.453.453 0 0 0 .1697-.1961.4382.4382 0 0 0 .0313-.2546.4444.4442 0 0 0-.1169-.2297zM.46 6.7225h18.7815a.9411.9411 0 0 0 .367-.0742.9202.9202 0 0 0 .306-.2106l3.962-4.1394a.4442.4442 0 0 0 .117-.2297.4378.4378 0 0 0-.0314-.2546.453.453 0 0 0-.1697-.196.469.469 0 0 0-.2523-.0734H4.7596a.941.941 0 0 0-.3658.0745.9203.9203 0 0 0-.3052.2102L.1246 5.9687a.4438.4438 0 0 0-.1169.2295.4375.4375 0 0 0 .0312.2544.4512.4512 0 0 0 .1692.196.4689.4689 0 0 0 .2518.0739z"/>
      </svg>
    </span>
    <span class="cypherpunk-send-label">Send Money</span>
  `;

  badge.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPaymentModal(handle, walletAddress);
  };

  // Wrap in a container div for proper spacing
  const badgeWrapper = document.createElement("div");
  badgeWrapper.className = "css-175oi2r r-xoduu5";
  badgeWrapper.appendChild(badge);

  // Insert after the name/verified badge
  nameRow.appendChild(badgeWrapper);
}

// Open payment modal
function openPaymentModal(handle, walletAddress) {
  // Remove existing modal if any
  const existingModal = document.getElementById("cypherpunk-modal");
  if (existingModal) {
    existingModal.remove();
  }

  const isLinked = !!walletAddress;
  const modalTitle = `Send USDC to ${handle}`;
  // Create modal overlay
  const modal = document.createElement("div");
  modal.id = "cypherpunk-modal";
  modal.className = "cypherpunk-modal-overlay";

  modal.innerHTML = `
    <div class="cypherpunk-modal">
      <div class="cypherpunk-modal-header">
        <h1 class="cypherpunk-brand">RIVO</h1>
        <button class="cypherpunk-modal-close"></button>
      </div>

      <div class="cypherpunk-modal-body">
        ${isLinked ? `
        <div class="cypherpunk-balance-display">
          <div class="cypherpunk-balance-label">
            <span class="cypherpunk-icon" style="-webkit-mask-image: url('${chrome.runtime.getURL('svgs/wallet.svg')}'); mask-image: url('${chrome.runtime.getURL('svgs/wallet.svg')}');"></span>
            Wallet Address
          </div>
          <div class="cypherpunk-wallet-address" title="${walletAddress}">
            ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}
          </div>
        </div>
        ` : `
        <div class="cypherpunk-info-card">
          <div class="cypherpunk-info-header">
            <span class="cypherpunk-icon" style="-webkit-mask-image: url('${chrome.runtime.getURL('svgs/info.svg')}'); mask-image: url('${chrome.runtime.getURL('svgs/info.svg')}');"></span>
            Info
          </div>
          <div class="cypherpunk-info-text">
            This user hasn't linked their wallet yet. Your USDC will be held in escrow and they can claim it when they link their wallet.
          </div>
        </div>
        `}

        <div class="cypherpunk-balance-display">
          <div class="cypherpunk-balance-label">
            <span class="cypherpunk-icon" style="-webkit-mask-image: url('${chrome.runtime.getURL('svgs/coins.svg')}'); mask-image: url('${chrome.runtime.getURL('svgs/coins.svg')}');"></span>
            Your Balance
          </div>
          <div id="user-balance" class="cypherpunk-balance-amount">
            <span class="cypherpunk-icon cypherpunk-loading-spinner" style="-webkit-mask-image: url('${chrome.runtime.getURL('svgs/loader-circle.svg')}'); mask-image: url('${chrome.runtime.getURL('svgs/loader-circle.svg')}');"></span>
            Loading...
          </div>
        </div>

        <h2 class="cypherpunk-modal-title">${modalTitle}</h2>

        <div class="cypherpunk-amount-input">
          <label for="usdc-amount">
            <span class="cypherpunk-icon" style="-webkit-mask-image: url('${chrome.runtime.getURL('svgs/hash.svg')}'); mask-image: url('${chrome.runtime.getURL('svgs/hash.svg')}');"></span>
            Amount (USDC)
          </label>
          <input
            type="number"
            id="usdc-amount"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div id="cypherpunk-status" class="cypherpunk-status"></div>
      </div>

      <div class="cypherpunk-modal-footer">
        <button class="cypherpunk-btn-secondary" id="cancel-btn">
          <span class="cypherpunk-icon" style="-webkit-mask-image: url('${chrome.runtime.getURL('svgs/x.svg')}'); mask-image: url('${chrome.runtime.getURL('svgs/x.svg')}');"></span>
          Cancel
        </button>
        <button class="cypherpunk-btn-primary" id="send-usdc-btn">
          <span class="cypherpunk-icon" style="-webkit-mask-image: url('${chrome.runtime.getURL('svgs/send-horizontal.svg')}'); mask-image: url('${chrome.runtime.getURL('svgs/send-horizontal.svg')}');"></span>
          ${isLinked ? "Send USDC" : "Send to Escrow"}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listener for close button
  const closeBtn = modal.querySelector(".cypherpunk-modal-close");
  closeBtn.addEventListener("click", () => {
    modal.remove();
  });

  // Add event listener for cancel button
  const cancelBtn = modal.querySelector("#cancel-btn");
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });

  // Add event listener for send button
  document.getElementById("send-usdc-btn").addEventListener("click", () => {
    sendUSDC(handle, walletAddress, isLinked);
  });

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Fetch and display user's USDC balance
  fetchUserBalance();
}

// Fetch user's USDC balance
async function fetchUserBalance() {
  const balanceEl = document.getElementById("user-balance");
  if (!balanceEl) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "getUserBalance",
    });

    if (response && response.success) {
      const balance = response.balance || 0;
      balanceEl.innerHTML = `${balance.toFixed(2)} USDC`;
      balanceEl.style.color = "hsl(var(--foreground))";
    } else {
      balanceEl.innerHTML = "Unable to load";
      balanceEl.style.color = "hsl(var(--muted-foreground))";
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    balanceEl.innerHTML = "Error";
    balanceEl.style.color = "hsl(var(--destructive))";
  }
}

// Track active transactions to prevent duplicates
let activeTransactionId = null;

// Send USDC transaction
async function sendUSDC(handle, walletAddress, isLinked) {
  const amountInput = document.getElementById("usdc-amount");
  const statusDiv = document.getElementById("cypherpunk-status");
  const sendBtn = document.getElementById("send-usdc-btn");

  const amount = parseFloat(amountInput.value);

  if (!amount || amount <= 0) {
    showStatus("Please enter a valid amount", "error");
    return;
  }

  // Prevent double-clicks and concurrent transactions
  if (sendBtn.disabled || activeTransactionId) {
    return;
  }

  // Generate unique transaction ID
  const txId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  activeTransactionId = txId;

  try {
    sendBtn.disabled = true;
    sendBtn.textContent = "Connecting to Phantom...";
    showStatus("Connecting to Phantom wallet...", "info");

    // Connect to Phantom via injected script
    window.cypherpunkPhantomConnected = null;
    window.cypherpunkPhantomError = null;

    window.postMessage({ type: "CYPHERPUNK_CONNECT_PHANTOM" }, "*");

    // Wait for response
    await new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.cypherpunkPhantomConnected) {
          clearInterval(checkInterval);
          resolve(window.cypherpunkPhantomConnected);
        }
        if (window.cypherpunkPhantomError) {
          clearInterval(checkInterval);
          reject(new Error(window.cypherpunkPhantomError.error));
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(
          new Error(
            "Phantom connection timeout. Please make sure Phantom is installed and unlocked.",
          ),
        );
      }, 10000);
    });

    const senderPublicKey = window.cypherpunkPhantomConnected.publicKey;

    showStatus("Building transaction...", "info");
    sendBtn.textContent = "Building...";

    // Build transaction via API - use different action based on whether wallet is linked
    const txResult = await chrome.runtime.sendMessage({
      action: isLinked ? "buildTransaction" : "buildUnlinkedTransaction",
      recipientWallet: walletAddress,
      socialHandle: handle,
      amount: amount,
      senderWallet: senderPublicKey,
    });

    if (txResult.error) {
      throw new Error(txResult.error);
    }

    showStatus("Please sign the transaction in Phantom...", "info");
    sendBtn.textContent = "Waiting for signature...";

    // Send transaction to Phantom for signing
    // Clear previous results
    window.cypherpunkTransactionSigned = null;
    window.cypherpunkPhantomError = null;

    window.postMessage(
      {
        type: "CYPHERPUNK_SEND_TOKENS",
        data: {
          transactionBase58: txResult.transaction,
          rpcUrl: "https://api.devnet.solana.com",
          txId: txId, // Use our unique transaction ID
        },
      },
      "*",
    );

    // Wait for transaction to be signed
    const signedResult = await new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.cypherpunkTransactionSigned) {
          clearInterval(checkInterval);
          resolve(window.cypherpunkTransactionSigned);
        }
        if (window.cypherpunkPhantomError) {
          clearInterval(checkInterval);
          reject(new Error(window.cypherpunkPhantomError.error));
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Transaction signing timeout"));
      }, 60000);
    });

    // If transaction needs to be sent, send it via background script
    if (signedResult.needsSending) {
      showStatus("Sending transaction to network...", "info");
      sendBtn.textContent = "Sending...";

      const sendResult = await chrome.runtime.sendMessage({
        action: "sendSignedTransaction",
        signedTransaction: signedResult.signedTransaction,
        rpcUrl: signedResult.rpcUrl,
      });

      if (sendResult.error) {
        throw new Error(sendResult.error);
      }

      const txSignature = sendResult.signature;

      // Store transaction locally
      const localTx = {
        id: txId,
        timestamp: Date.now(),
        type: "sent",
        handle: handle,
        amount: amount,
        amountMicro: Math.floor(amount * 1_000_000),
        senderWallet: senderPublicKey,
        recipientWallet: walletAddress || undefined,
        signature: txSignature,
        status: "confirmed",
      };
      storeTransaction(localTx);

      showStatus(`✅ Successfully sent ${amount} USDC!`, "success");
      sendBtn.textContent = "Sent!";

      // Show transaction link
      setTimeout(() => {
        statusDiv.innerHTML += `<br><a href="https://explorer.solana.com/tx/${txSignature}?cluster=devnet" target="_blank" style="color: #14F195; text-decoration: underline;">View on Explorer</a>`;
      }, 500);
    } else if (signedResult.success) {
      // Old flow for backward compatibility
      const txSignature = signedResult.signature;

      // Store transaction locally
      const localTx = {
        id: txId,
        timestamp: Date.now(),
        type: "sent",
        handle: handle,
        amount: amount,
        amountMicro: Math.floor(amount * 1_000_000),
        senderWallet: senderPublicKey,
        recipientWallet: walletAddress || undefined,
        signature: txSignature,
        status: "confirmed",
      };
      storeTransaction(localTx);

      showStatus(`✅ Successfully sent ${amount} USDC!`, "success");
      sendBtn.textContent = "Sent!";

      // Show transaction link
      setTimeout(() => {
        statusDiv.innerHTML += `<br><a href="https://explorer.solana.com/tx/${txSignature}?cluster=devnet" target="_blank" style="color: #14F195; text-decoration: underline;">View on Explorer</a>`;
      }, 500);
    } else {
      throw new Error(signedResult.message || "Transaction failed");
    }
  } catch (error) {
    console.error("Error sending USDC:", error);
    showStatus(`❌ Error: ${error.message}`, "error");
    sendBtn.disabled = false;
    sendBtn.textContent = isLinked ? "Send USDC" : "Send to Escrow";
  } finally {
    // Clear active transaction ID
    activeTransactionId = null;
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById("cypherpunk-status");
  statusDiv.textContent = message;
  statusDiv.className = `cypherpunk-status cypherpunk-status-${type}`;
}

/**
 * Store transaction via background script
 * The background script handles persistent storage in chrome.storage.local
 * which is accessible to content scripts, background workers, and through messaging from web pages
 */
async function storeTransaction(transaction) {
  try {
    // Send transaction to background script which will POST to API
    const response = await chrome.runtime.sendMessage({
      action: "storeTransaction",
      transaction: transaction,
    });

    if (response && response.success) {
    } else {
      console.warn("Failed to store transaction:", response?.error);
    }
  } catch (e) {
    console.error("Error storing transaction:", e);
  }
}
