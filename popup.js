const COINS_KEY = 'binance_tracker_coins';
const DEFAULT_COINS = [];

document.getElementById('addBtn').addEventListener('click', addCoin);
document.getElementById('coinInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addCoin();
});

loadAndRender();

async function loadAndRender() {
  const { [COINS_KEY]: coins = DEFAULT_COINS } = await chrome.storage.local.get(COINS_KEY);
  renderList(coins);
}

function addCoin() {
  const input = document.getElementById('coinInput');
  const symbol = input.value.trim().toUpperCase();
  input.value = '';
  if (!symbol) return;
  chrome.storage.local.get(COINS_KEY, (data) => {
    const coins = data[COINS_KEY] || DEFAULT_COINS;
    if (coins.includes(symbol)) return;
    const next = [...coins, symbol];
    chrome.storage.local.set({ [COINS_KEY]: next }, loadAndRender);
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
  coins.forEach((symbol) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${symbol}</span><button data-symbol="${symbol}">Remove</button>`;
    li.querySelector('button').addEventListener('click', () => removeCoin(symbol));
    list.appendChild(li);
  });
}
