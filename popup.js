const COINS_KEY = 'binance_tracker_coins';
const DEFAULT_COINS = [];
const MAX_COINS = 20;

const VALID_SYMBOL = /^[A-Za-z0-9]{2,10}$/;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showMessage(msg, isError = false) {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? 'message error' : 'message';
  el.setAttribute('aria-live', 'polite');
  setTimeout(() => {
    el.textContent = '';
    el.className = 'message';
  }, 3000);
}

document.getElementById('addBtn').addEventListener('click', addCoin);
document.getElementById('coinInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addCoin();
});

loadAndRender();

async function loadAndRender() {
  try {
    const { [COINS_KEY]: raw = [] } = await chrome.storage.local.get(COINS_KEY);
    const coins = Array.isArray(raw) ? raw.filter((c) => typeof c === 'string' && VALID_SYMBOL.test(c.trim())).slice(0, MAX_COINS) : DEFAULT_COINS;
    renderList(coins);
  } catch (err) {
    renderList(DEFAULT_COINS);
  }
}

function addCoin() {
  const input = document.getElementById('coinInput');
  const raw = input.value.trim().toUpperCase();
  input.value = '';
  if (!raw) return;
  if (!VALID_SYMBOL.test(raw)) {
    showMessage('Use 2–10 letters or numbers (e.g. BTC, ETH)', true);
    return;
  }
  chrome.storage.local.get(COINS_KEY, (data) => {
    const coins = data[COINS_KEY] || DEFAULT_COINS;
    const list = Array.isArray(coins) ? coins : [];
    if (list.includes(raw)) {
      showMessage('Already added', true);
      return;
    }
    if (list.length >= MAX_COINS) {
      showMessage(`Maximum ${MAX_COINS} coins`, true);
      return;
    }
    const next = [...list, raw].slice(0, MAX_COINS);
    chrome.storage.local.set({ [COINS_KEY]: next }, () => {
      loadAndRender();
      showMessage('Added');
    });
  });
}

function removeCoin(symbol) {
  chrome.storage.local.get(COINS_KEY, (data) => {
    const coins = (data[COINS_KEY] || DEFAULT_COINS).filter((c) => c !== symbol);
    chrome.storage.local.set({ [COINS_KEY]: coins }, loadAndRender);
  });
}

function renderList(coins) {
  const list = document.getElementById('coinList');
  list.innerHTML = '';
  (Array.isArray(coins) ? coins : []).forEach((symbol) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = symbol;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-symbol', escapeHtml(symbol));
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => removeCoin(symbol));
    li.appendChild(span);
    li.appendChild(btn);
    list.appendChild(li);
  });
}
