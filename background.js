const COINS_KEY = 'binance_tracker_coins';
const PRICES_KEY = 'binance_tracker_prices';
const TICKER24_KEY = 'binance_tracker_ticker24';
const SPARKLINE_KEY = 'binance_tracker_sparkline';
const BINANCE_API = 'https://api.binance.com/api/v3';
const POLL_MS = 3000;
const SPARKLINE_POLL_MS = 60000;
const MAX_COINS = 20;

const VALID_SYMBOL = /^[A-Z0-9]{2,10}$/;

function sanitizeCoins(coins) {
  if (!Array.isArray(coins)) return [];
  return coins
    .filter((c) => typeof c === 'string' && VALID_SYMBOL.test(c.trim().toUpperCase()))
    .map((c) => c.trim().toUpperCase())
    .filter((c, i, a) => a.indexOf(c) === i)
    .slice(0, MAX_COINS);
}

async function getCoins() {
  const { [COINS_KEY]: raw = [] } = await chrome.storage.local.get(COINS_KEY);
  const coins = sanitizeCoins(raw);
  if (JSON.stringify(coins) !== JSON.stringify(raw)) {
    await chrome.storage.local.set({ [COINS_KEY]: coins });
  }
  return coins;
}

async function fetchPrices() {
  const coins = await getCoins();
  if (coins.length === 0) {
    await chrome.storage.local.set({
      [PRICES_KEY]: {},
      [TICKER24_KEY]: {},
    });
    return;
  }
  const symbols = coins.map((c) => `${c}USDT`);
  try {
    const [priceRes, ticker24Res] = await Promise.all([
      fetch(`${BINANCE_API}/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`),
      fetch(`${BINANCE_API}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`),
    ]);
    if (!priceRes.ok || !ticker24Res.ok) throw new Error(`API ${priceRes.status}`);
    const priceData = await priceRes.json();
    const ticker24Data = await ticker24Res.json();
    if (!Array.isArray(priceData) || !Array.isArray(ticker24Data)) throw new Error('Invalid response');
    const prices = {};
    const ticker24 = {};
    priceData.forEach((row) => {
      if (row && row.symbol && row.price != null) {
        const coin = String(row.symbol).replace('USDT', '');
        if (coins.includes(coin)) prices[coin] = row.price;
      }
    });
    ticker24Data.forEach((row) => {
      if (row && row.symbol) {
        const coin = String(row.symbol).replace('USDT', '');
        if (coins.includes(coin)) {
          ticker24[coin] = {
            priceChangePercent: row.priceChangePercent,
            highPrice: row.highPrice,
            lowPrice: row.lowPrice,
            volume: row.volume,
            quoteVolume: row.quoteVolume,
          };
        }
      }
    });
    await chrome.storage.local.set({ [PRICES_KEY]: prices, [TICKER24_KEY]: ticker24 });
  } catch (err) {
    if (typeof err?.message === 'string') {
      console.warn('[Ticker] Price fetch failed:', err.message);
    }
  }
}

async function fetchSparkline() {
  const coins = await getCoins();
  if (coins.length === 0) {
    await chrome.storage.local.set({ [SPARKLINE_KEY]: {} });
    return;
  }
  try {
    const results = await Promise.all(
      coins.map(async (coin) => {
        const symbol = `${coin}USDT`;
        const res = await fetch(`${BINANCE_API}/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=24`);
        if (!res.ok) return { coin, closes: [] };
        const data = await res.json();
        if (!Array.isArray(data)) return { coin, closes: [] };
        const closes = data.map((c) => (Array.isArray(c) && typeof c[4] === 'number' ? c[4] : parseFloat(c[4]))).filter((n) => Number.isFinite(n));
        return { coin, closes };
      })
    );
    const sparklines = {};
    results.forEach(({ coin, closes }) => {
      sparklines[coin] = closes.length >= 2 ? closes : [];
    });
    await chrome.storage.local.set({ [SPARKLINE_KEY]: sparklines });
  } catch (err) {
    if (typeof err?.message === 'string') {
      console.warn('[Ticker] Sparkline fetch failed:', err.message);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  fetchPrices();
  fetchSparkline();
});

fetchPrices();
fetchSparkline();
setInterval(fetchPrices, POLL_MS);
setInterval(fetchSparkline, SPARKLINE_POLL_MS);
