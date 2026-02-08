const COINS_KEY = 'binance_tracker_coins';
const PRICES_KEY = 'binance_tracker_prices';
const TICKER24_KEY = 'binance_tracker_ticker24';
const SPARKLINE_KEY = 'binance_tracker_sparkline';
const BINANCE_API = 'https://api.binance.com/api/v3';
const POLL_MS = 3000;

async function fetchPrices() {
  const { [COINS_KEY]: coins = [] } = await chrome.storage.local.get(COINS_KEY);
  if (coins.length === 0) {
    await chrome.storage.local.set({ [PRICES_KEY]: {}, [TICKER24_KEY]: {}, [SPARKLINE_KEY]: {} });
    return;
  }
  const symbols = coins.map((c) => `${c}USDT`);
  try {
    const [priceRes, ticker24Res] = await Promise.all([
      fetch(`${BINANCE_API}/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`),
      fetch(`${BINANCE_API}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`),
    ]);
    if (!priceRes.ok || !ticker24Res.ok) throw new Error('API error');
    const priceData = await priceRes.json();
    const ticker24Data = await ticker24Res.json();
    const prices = {};
    const ticker24 = {};
    priceData.forEach(({ symbol, price }) => {
      const coin = symbol.replace('USDT', '');
      prices[coin] = price;
    });
    ticker24Data.forEach(({ symbol, priceChangePercent, highPrice, lowPrice, volume, quoteVolume }) => {
      const coin = symbol.replace('USDT', '');
      ticker24[coin] = { priceChangePercent, highPrice, lowPrice, volume, quoteVolume };
    });
    await chrome.storage.local.set({ [PRICES_KEY]: prices, [TICKER24_KEY]: ticker24 });
  } catch (e) {
    console.warn('[Ticker] Price fetch failed:', e.message);
  }
}

async function fetchSparkline() {
  const { [COINS_KEY]: coins = [] } = await chrome.storage.local.get(COINS_KEY);
  if (coins.length === 0) return;
  try {
    const results = await Promise.all(
      coins.map(async (coin) => {
        const symbol = `${coin}USDT`;
        const res = await fetch(`${BINANCE_API}/klines?symbol=${symbol}&interval=1h&limit=24`);
        if (!res.ok) return { coin, closes: [] };
        const data = await res.json();
        const closes = data.map((c) => parseFloat(c[4]));
        return { coin, closes };
      })
    );
    const sparklines = {};
    results.forEach(({ coin, closes }) => { sparklines[coin] = closes; });
    await chrome.storage.local.set({ [SPARKLINE_KEY]: sparklines });
  } catch (e) {
    console.warn('[Ticker] Sparkline fetch failed:', e.message);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  fetchPrices();
  fetchSparkline();
  setInterval(fetchPrices, POLL_MS);
  setInterval(fetchSparkline, 60000);
});

fetchPrices();
fetchSparkline();
setInterval(fetchPrices, POLL_MS);
setInterval(fetchSparkline, 60000);
