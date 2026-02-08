# Ticker (Chrome Extension)

Live cryptocurrency prices at the bottom of every tab. Track Bitcoin, Ethereum, Solana and other coins in real time.

## Features

- **Add coins** (e.g. BTC, ETH, SOL) via the extension popup
- **Fixed bottom bar** on every page: full width, 50px height
- **Real-time prices** (updates every 3 seconds)
- **24h stats** on hover: high, low, volume

## Install

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder

## Usage

1. Click the extension icon
2. Type a coin symbol (e.g. BTC, ETH) and click **Add**
3. The bar at the bottom of any tab shows live prices; remove coins with **Remove** in the popup

## Chrome Web Store discoverability

When you publish to the Chrome Web Store, use these so **Ticker** shows up in search:

- **Short description** (132 chars): Use the manifest description or: *Live crypto prices at the bottom of every tab. Track Bitcoin, Ethereum and other coins in real time.*
- **Detailed description**: Include phrases like: crypto ticker, cryptocurrency prices, Bitcoin price, Ethereum tracker, live crypto, real-time prices, BTC ETH SOL.
- **Category**: Productivity or Shopping.
- **Tags** (if the store asks): `crypto`, `cryptocurrency`, `Bitcoin`, `Ethereum`, `prices`, `ticker`, `tracker`, `live prices`, `real-time`.

No API key required; uses public market data.

## Production

- **Validation**: Coin symbols must be 2–10 alphanumeric characters; max 20 coins. Invalid or duplicate entries are rejected with feedback.
- **Security**: User input is escaped in the popup and content script; API responses are validated before use.
- **Storage**: Only `chrome.storage.local` is used; data is sanitized on read in the background script.
- **Errors**: Failed API requests are logged in the service worker console; the bar keeps showing last known data.
