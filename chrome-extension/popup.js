// Popup script
const API_BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async () => {
  await loadStatus();
});

function shorten(address) {
  if (!address || address.length < 10) return address || "";
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function bindRefreshButton() {
  const btn = document.getElementById("refresh-btn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", async () => {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Refreshing...";
    try {
      await loadStatus();
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

function setConnectedUI(connected, wallet) {
  const connectedView = document.getElementById("connected-view");
  const disconnectedView = document.getElementById("disconnected-view");
  if (!connectedView || !disconnectedView) return;

  if (connected) {
    connectedView.classList.remove("hidden");
    disconnectedView.classList.add("hidden");
    const addrEl = document.getElementById("wallet-address");
    if (addrEl) {
      const short = shorten(wallet);
      addrEl.textContent = short;
      // Tooltip: native via title, UIkit via data-uk-tooltip
      addrEl.setAttribute("title", wallet || "");
      addrEl.setAttribute(
        "data-uk-tooltip",
        wallet ? `title: ${wallet}; pos: top` : "",
      );
    }
    bindRefreshButton();
  } else {
    connectedView.classList.add("hidden");
    disconnectedView.classList.remove("hidden");
  }
}

async function loadStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      setConnectedUI(true, data.wallet);

      // Fetch USDC balance
      await loadBalance();
    } else {
      setConnectedUI(false);
    }
  } catch (error) {
    console.error("Error loading status:", error);
    setConnectedUI(false);
  }
}

async function loadBalance() {
  const balanceEl = document.getElementById("usdc-balance");
  if (!balanceEl) return;

  try {
    balanceEl.innerHTML =
      '<span class="text-muted-foreground">Loading...</span>';

    const response = await fetch(`${API_BASE_URL}/api/tokens/balance`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      const balance = data.balance || 0;
      balanceEl.textContent = `${balance.toFixed(2)} USDC`;
    } else {
      balanceEl.innerHTML =
        '<span class="text-muted-foreground text-xs">Unable to load</span>';
    }
  } catch (error) {
    console.error("Error loading balance:", error);
    balanceEl.innerHTML =
      '<span class="text-muted-foreground text-xs">Error loading</span>';
  }
}
