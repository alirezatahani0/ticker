const COINS_KEY = 'binance_tracker_coins';
const PRICES_KEY = 'binance_tracker_prices';
const TICKER24_KEY = 'binance_tracker_ticker24';
const SPARKLINE_KEY = 'binance_tracker_sparkline';
const VALID_SYMBOL = /^[A-Z0-9]{2,10}$/;

function escapeHtml(str) {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createBar() {
	if (document.getElementById('binance-tracker-bar')) return;
	const bar = document.createElement('div');
	bar.id = 'binance-tracker-bar';
	bar.setAttribute('aria-label', 'Ticker - live crypto prices');
	document.body.appendChild(bar);
	return bar;
}

function formatPrice(price) {
  if (price == null) return '—';
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000)
		return n.toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	if (n >= 1)
		return n.toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 4,
		});
	return n.toLocaleString('en-US', {
		minimumFractionDigits: 4,
		maximumFractionDigits: 6,
	});
}

function formatChange(pct) {
  if (pct == null || pct === '') return '';
  const n = Number(pct);
  if (!Number.isFinite(n)) return '';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function formatVolume(vol) {
  if (vol == null) return '—';
  const n = Number(vol);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(0);
}

function buildSparklineSvg(values, symbol) {
	if (!values || values.length < 2) return '';
	const n = values.length;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const padX = 4;
	const padY = 4;
	const width = 200;
	const height = 34;
	const innerW = width - padX * 2;
	const innerH = height - padY * 2;
	const pts = values.map((v, i) => {
		const x = padX + (i / (n - 1)) * innerW;
		const y = padY + innerH - ((v - min) / range) * innerH;
		return { x, y };
	});
	let pathD = `M ${pts[0].x} ${pts[0].y}`;
	for (let i = 1; i < pts.length; i++) pathD += ` L ${pts[i].x} ${pts[i].y}`;
	const areaD = `M ${pts[0].x} ${height - padY} L ${pts[0].x} ${pts[0].y} ${pathD.replace('M ', 'L ')} L ${pts[pts.length - 1].x} ${height - padY} Z`;
	const safeId = String(symbol).replace(/[^A-Za-z0-9_-]/g, '') || 'spark';
	const gradId = `bt-spark-grad-${safeId}`;
	const gridStepX = innerW / 4;
	const gridStepY = innerH / 3;
	const gridLines = [];
	for (let i = 1; i <= 3; i++) {
		const x = padX + i * gridStepX;
		gridLines.push(
			`<line x1="${x}" y1="${padY}" x2="${x}" y2="${height - padY}" stroke="#2b3139" stroke-width="0.5" stroke-dasharray="2 2"/>`,
		);
	}
	for (let i = 1; i <= 2; i++) {
		const y = padY + i * gridStepY;
		gridLines.push(
			`<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="#2b3139" stroke-width="0.5" stroke-dasharray="2 2"/>`,
		);
	}
	const gridBg = `<g class="bt-spark-grid">${gridLines.join('')}</g>`;
	return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="bt-sparkline-svg">${gridBg}<defs><linearGradient id="${gradId}" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#61a8ff" stop-opacity="0"/><stop offset="100%" stop-color="#8fc5ff" stop-opacity="0.5"/></linearGradient></defs><path d="${areaD}" fill="url(#${gradId})"/><path d="${pathD}" fill="none" stroke="#61a8ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderBar(coins, prices, ticker24, sparklineData) {
	let bar = document.getElementById('binance-tracker-bar');
	if (!bar) bar = createBar();
	if (!coins || coins.length === 0) {
		bar.classList.add('bt-empty');
		bar.innerHTML = '';
		return;
	}
	bar.classList.remove('bt-empty');
	bar.innerHTML = `
    <div class="bt-left">
      <div class="bt-title-wrap">
        <span class="bt-label">Live prices</span>
      </div>
      <div class="bt-coins">
        ${coins
					.map((symbol) => {
						const t24 = ticker24[symbol];
						const pct =
							t24 && (typeof t24 === 'object' ? t24.priceChangePercent : t24);
						const changeClass =
							pct != null && pct !== ''
								? Number(pct) >= 0
									? 'positive'
									: 'negative'
								: 'neutral';
						const sparkValues = sparklineData[symbol];
						const sparkHtml =
							sparkValues && sparkValues.length >= 2
								? `<div class="bt-coin-sparkline">${buildSparklineSvg(sparkValues, symbol)}</div>`
								: '';
						const high = t24 && typeof t24 === 'object' ? t24.highPrice : null;
						const low = t24 && typeof t24 === 'object' ? t24.lowPrice : null;
						const vol = t24 && typeof t24 === 'object' ? t24.quoteVolume : null;
						const expandHtml = `<div class="bt-coin-expand">
                <div class="bt-coin-expand-inner">
                  ${high != null ? `<div class="bt-hover-row"><span class="bt-hover-label">24h High</span><span class="bt-hover-value">$${formatPrice(high)}</span></div>` : ''}
                  ${low != null ? `<div class="bt-hover-row"><span class="bt-hover-label">24h Low</span><span class="bt-hover-value">$${formatPrice(low)}</span></div>` : ''}
                  ${vol != null ? `<div class="bt-hover-row"><span class="bt-hover-label">24h Vol</span><span class="bt-hover-value">$${formatVolume(vol)}</span></div>` : ''}
                </div>
              </div>`;
						const safeSymbol = escapeHtml(symbol);
						return `
          <div class="bt-coin">
            <div class="bt-coin-main">
              <div class="bt-coin-info">
                <span class="bt-symbol">${safeSymbol}</span>
                <div class="bt-coin-top">
                  <span class="bt-price">$${formatPrice(prices[symbol])}</span>
                  ${pct != null && pct !== '' ? `<span class="bt-change ${changeClass}">${formatChange(pct)}</span>` : ''}
                </div>
              </div>
              ${sparkHtml}
            </div>
              ${expandHtml}
          </div>`;
					})
					.join('')}
      </div>
    </div>`;
}

function update() {
  chrome.storage.local.get(
    [COINS_KEY, PRICES_KEY, TICKER24_KEY, SPARKLINE_KEY],
    (data) => {
      const raw = data[COINS_KEY];
      const coins = Array.isArray(raw)
        ? raw.filter((c) => typeof c === 'string' && VALID_SYMBOL.test(c))
        : [];
      const prices = data[PRICES_KEY] && typeof data[PRICES_KEY] === 'object' ? data[PRICES_KEY] : {};
      const ticker24 = data[TICKER24_KEY] && typeof data[TICKER24_KEY] === 'object' ? data[TICKER24_KEY] : {};
      const sparklineData = data[SPARKLINE_KEY] && typeof data[SPARKLINE_KEY] === 'object' ? data[SPARKLINE_KEY] : {};
      renderBar(coins, prices, ticker24, sparklineData);
    }
  );
}

function init() {
  if (document.body) {
    createBar();
    update();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      createBar();
      update();
    });
  }
}

init();
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if ([COINS_KEY, PRICES_KEY, TICKER24_KEY, SPARKLINE_KEY].some((k) => k in changes)) update();
});
