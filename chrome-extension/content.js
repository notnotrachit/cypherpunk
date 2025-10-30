// Content script for Twitter/X integration

const API_BASE_URL = "http://localhost:3000";
let processedProfiles = new Set();
let injectedScriptReady = false;

console.log("🚀 Cypherpunk extension loaded on:", window.location.href);

// Inject script into page context to access window.solana
function injectScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = function () {
    console.log("💉 Injected script loaded");
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from injected script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const { type, data } = event.data;

  if (type === "CYPHERPUNK_INJECTED_READY") {
    injectedScriptReady = true;
    console.log("✅ Injected script ready");
  }

  if (type === "CYPHERPUNK_PHANTOM_STATUS") {
    window.cypherpunkPhantomStatus = data;
  }

  if (type === "CYPHERPUNK_PHANTOM_CONNECTED") {
    window.cypherpunkPhantomConnected = data;
  }

  if (type === "CYPHERPUNK_TRANSACTION_SIGNED") {
    window.cypherpunkTransactionSigned = data;
  }

  if (type === "CYPHERPUNK_PHANTOM_ERROR") {
    window.cypherpunkPhantomError = data;
  }
});

// Initialize
init();

function init() {
  console.log("🔧 Initializing extension...");

  // Inject script to access Phantom
  injectScript();

  // Watch for profile changes (Twitter is a SPA)
  observeProfileChanges();

  // Process current page after a delay
  setTimeout(() => {
    console.log("⏰ Initial check...");
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
      console.log("🔄 URL changed from", lastUrl, "to", currentUrl);
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

// Process the current page
async function processCurrentPage() {
  console.log("📄 Processing page:", window.location.pathname);

  // Check if we're on a profile page
  const isProfilePage = window.location.pathname.match(/^\/[^\/]+$/);
  console.log("🔍 Is profile page?", isProfilePage);

  if (isProfilePage) {
    const handle = extractTwitterHandle();
    console.log("👤 Extracted handle:", handle);

    if (handle && !processedProfiles.has(handle)) {
      console.log("✨ New profile detected:", handle);
      processedProfiles.add(handle);
      await checkAndAddSolanaButton(handle);
    } else if (handle) {
      console.log("⏭️ Profile already processed:", handle);
    } else {
      console.log("❌ Could not extract handle");
    }
  } else {
    console.log("⏭️ Not a profile page, skipping");
  }

  // Also check for profile cards in timeline
  processTimelineProfiles();
}

// Extract Twitter handle from profile page
function extractTwitterHandle() {
  console.log("🔎 Extracting Twitter handle...");

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
    console.log("  ✅ Extracted from URL:", handle);
    return handle;
  }

  // Fallback: Try specific selectors for the profile header
  const selectors = [
    '[data-testid="UserName"] span:first-child', // More specific selector for the actual username
    '[data-testid="UserProfileHeader_Items"] span[dir="ltr"]', // Profile header username
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(
      `  Checking selector "${selector}": found ${elements.length} elements`,
    );

    for (const el of elements) {
      const text = el.textContent;
      if (
        text &&
        text.startsWith("@") &&
        !text.includes(" ") &&
        text.length > 1
      ) {
        console.log("  ✅ Found handle in element:", text.trim());
        return text.trim();
      }
    }
  }

  console.log("  ❌ Could not extract handle");
  return null;
}

// Check wallet and add Solana button
async function checkAndAddSolanaButton(handle) {
  console.log("🔍 Checking wallet for:", handle);

  try {
    // Check if wallet is linked
    console.log("📡 Sending message to background script...");
    const result = await chrome.runtime.sendMessage({
      action: "checkWallet",
      handle: handle,
      platform: "twitter",
    });

    console.log("📨 Received response:", result);

    if (result.error) {
      console.error("❌ Error checking wallet:", result.error);
      // Still show button even if there's an error
      addSolanaButton(handle, null);
      return;
    }

    if (result.found) {
      console.log("✅ Wallet found!", result.wallet);
      addSolanaButton(handle, result.wallet);
    } else {
      console.log(
        "ℹ️ No wallet linked for",
        handle,
        "- will use send_to_unlinked",
      );
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
  console.log(
    "🎨 Adding Solana button for:",
    handle,
    "Wallet:",
    walletAddress || "Not linked",
  );

  // Check if button already exists
  if (document.getElementById("cypherpunk-solana-btn")) {
    console.log("⏭️ Button already exists, skipping");
    return;
  }

  // Find the UserName container (has the name and blue tick)
  const userNameContainer = document.querySelector('[data-testid="UserName"]');

  if (!userNameContainer) {
    console.log("❌ Could not find UserName container");
    return;
  }

  console.log("📍 UserName container found");

  // Find the row that contains the name and verified badge
  const nameRow = userNameContainer.querySelector(
    ".css-175oi2r.r-1awozwy.r-18u37iz.r-dnmrzs",
  );

  if (!nameRow) {
    console.log("❌ Could not find name row");
    return;
  }

  // Create Solana badge (smaller, icon-only for inline display)
  const badge = document.createElement("button");
  badge.id = "cypherpunk-solana-btn";
  badge.className = walletAddress
    ? "cypherpunk-solana-badge cypherpunk-linked"
    : "cypherpunk-solana-badge cypherpunk-unlinked";
  badge.setAttribute(
    "aria-label",
    walletAddress ? "Pay with Solana" : "Send USDC (Claimable)",
  );
  badge.setAttribute("type", "button");
  badge.setAttribute(
    "title",
    walletAddress
      ? "Pay with Solana"
      : "Send USDC - User can claim when they link wallet",
  );
  badge.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 397.7 311.7" fill="currentColor">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
    </svg>
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
  console.log("✅ Solana badge added next to name");

  console.log("✅ Solana button added for", handle);
}

// Process timeline profiles (hover cards, etc.)
function processTimelineProfiles() {
  // This can be extended to add indicators on timeline profiles
  // For now, we focus on the main profile page
}

// Open payment modal
function openPaymentModal(handle, walletAddress) {
  // Remove existing modal if any
  const existingModal = document.getElementById("cypherpunk-modal");
  if (existingModal) {
    existingModal.remove();
  }

  const isLinked = !!walletAddress;
  const modalTitle = isLinked
    ? `Send USDC to ${handle}`
    : `Send USDC to ${handle} (Claimable)`;

  // Create modal overlay
  const modal = document.createElement("div");
  modal.id = "cypherpunk-modal";
  modal.className = "cypherpunk-modal-overlay";

  const walletInfoHtml = isLinked
    ? `
    <div class="cypherpunk-wallet-info">
      <div class="cypherpunk-label">Wallet Address</div>
      <div class="cypherpunk-wallet-address">
        ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}
        <button class="cypherpunk-copy-btn" data-wallet="${walletAddress}">
          📋
        </button>
      </div>
    </div>
  `
    : `
    <div class="cypherpunk-wallet-info">
      <div class="cypherpunk-label">⚠️ Wallet Not Linked</div>
      <div class="cypherpunk-wallet-address" style="font-size: 14px; line-height: 1.5;">
        This user hasn't linked their wallet yet. Your USDC will be held in escrow and they can claim it when they link their wallet.
      </div>
    </div>
  `;

  modal.innerHTML = `
    <div class="cypherpunk-modal">
      <div class="cypherpunk-modal-header">
        <h2>${modalTitle}</h2>
        <button class="cypherpunk-modal-close">×</button>
      </div>

      <div class="cypherpunk-modal-body">
        ${walletInfoHtml}

        <div class="cypherpunk-balance-display" id="balance-display">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; margin-bottom: 16px;">
            <span style="color: #a0a0a0; font-size: 13px;">Your Balance:</span>
            <span id="user-balance" style="color: #14F195; font-weight: 600; font-size: 14px;">Loading...</span>
          </div>
        </div>

        <div class="cypherpunk-amount-input">
          <label for="usdc-amount">Amount (USDC)</label>
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
          Cancel
        </button>
        <button class="cypherpunk-btn-primary" id="send-usdc-btn">
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

  // Add event listener for copy button (if wallet is linked)
  if (isLinked) {
    const copyBtn = modal.querySelector(".cypherpunk-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const walletToCopy = copyBtn.getAttribute("data-wallet");
        navigator.clipboard
          .writeText(walletToCopy)
          .then(() => {
            copyBtn.textContent = "✓";
            setTimeout(() => {
              copyBtn.textContent = "📋";
            }, 1000);
          })
          .catch((err) => {
            console.error("Failed to copy wallet address:", err);
          });
      });
    }
  }

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
      balanceEl.textContent = `${balance.toFixed(2)} USDC`;
      balanceEl.style.color = "#14F195";
    } else {
      balanceEl.textContent = "Unable to load";
      balanceEl.style.color = "#a0a0a0";
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    balanceEl.textContent = "Error";
    balanceEl.style.color = "#a0a0a0";
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
    console.log("Transaction already in progress, ignoring click");
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
    console.log("✅ Connected to Phantom:", senderPublicKey);

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
      console.log("✅ Transaction sent:", txSignature);

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
      console.log("✅ Transaction confirmed:", txSignature);

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
    console.log("📤 Sending transaction to API:", transaction.id);

    // Send transaction to background script which will POST to API
    const response = await chrome.runtime.sendMessage({
      action: "storeTransaction",
      transaction: transaction,
    });

    if (response && response.success) {
      console.log("✅ Transaction stored successfully:", transaction.id);
    } else {
      console.warn("Failed to store transaction:", response?.error);
    }
  } catch (e) {
    console.error("Error storing transaction:", e);
  }
}
