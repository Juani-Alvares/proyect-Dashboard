// script.js
// --------------------------------------------------
// Crypto Dashboard: BTC & ETH (Chart.js + CoinGecko)
// - historial (7/30 días) se carga al inicio y cuando cambias rango
// - precio y %24h se actualiza CADA 5 segundos y se añade al gráfico
// - sidebar hamburguesa para móviles y active link
// --------------------------------------------------

const API_BASE = 'https://api.coingecko.com/api/v3';

// DOM
const btcPriceEl = document.getElementById('btcPrice');
const ethPriceEl = document.getElementById('ethPrice');
const btcChangeEl = document.getElementById('btcChange');
const ethChangeEl = document.getElementById('ethChange');

const daysSelect = document.getElementById('daysSelect');
const currencySelect = document.getElementById('currencySelect');
const currencySelectMobile = document.getElementById('currencySelectMobile');

const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebarEl = document.getElementById('sidebar');

// CSS var helpers (to keep colors consistent)
const css = getComputedStyle(document.documentElement);
const ORANGE = css.getPropertyValue('--naranja')?.trim() || '#ff8c42';
function hexToRgba(hex, alpha = 0.12) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Chart instances
let btcChart = null;
let ethChart = null;

// State
let state = {
  currency: 'usd',
  days: 7,
  // limit the number of appended live points so charts keep responsive
  maxPoints: 200
};

// --------------------
// Utilities
// --------------------
function formatNumber(num, currency) {
  // simple formatter (prefix symbol for usd/eur)
  if (currency === 'usd') return '$ ' + Number(num).toLocaleString();
  if (currency === 'eur') return '€ ' + Number(num).toLocaleString();
  return Number(num).toLocaleString() + ' ' + currency.toUpperCase();
}

// --------------------
// Fetch historical data (CoinGecko market_chart)
// returns array of {x: timestamp(ms), y: price}
// --------------------
async function fetchHistorical(coinId, days, vs_currency) {
  const url = `${API_BASE}/coins/${coinId}/market_chart?vs_currency=${vs_currency}&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error fetch historical');
  const json = await res.json();
  // json.prices -> [[timestamp, price], ...]
  return json.prices.map(p => ({ x: p[0], y: Number(p[1].toFixed(2)) }));
}

// --------------------
// Fetch live prices + 24h change (simple price endpoint)
// --------------------
async function fetchLivePrices(vs_currency) {
  const url = `${API_BASE}/simple/price?ids=bitcoin,ethereum&vs_currencies=${vs_currency}&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error fetch live prices');
  return await res.json(); // e.g. { bitcoin: { usd: 63000, usd_24h_change: -1.23 }, ethereum: {...} }
}

// --------------------
// Create Chart.js time-series chart given canvas element and initial data
// --------------------
function createTimeChart(canvasEl, label, data) {
  return new Chart(canvasEl, {
    type: 'line',
    data: { datasets: [{
      label,
      data,
      borderColor: ORANGE,
      backgroundColor: hexToRgba(ORANGE, 0.12),
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.2,
      fill: true
    }]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--font').trim() } },
        tooltip: { mode: 'nearest', intersect: false }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: (state.days <= 1 ? 'hour' : 'day') },
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--font').trim() }
        },
        y: {
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--font').trim() },
          beginAtZero: false
        }
      }
    }
  });
}

// --------------------
// Initialize charts (load historical then create charts)
// --------------------
async function initCharts() {
  try {
    const [btcData, ethData] = await Promise.all([
      fetchHistorical('bitcoin', state.days, state.currency),
      fetchHistorical('ethereum', state.days, state.currency)
    ]);

    // destroy if exist
    if (btcChart) btcChart.destroy();
    if (ethChart) ethChart.destroy();

    const btcCanvas = document.getElementById('btcChart').getContext('2d');
    const ethCanvas = document.getElementById('ethChart').getContext('2d');

    btcChart = createTimeChart(btcCanvas, 'BTC/' + state.currency.toUpperCase(), btcData);
    ethChart = createTimeChart(ethCanvas, 'ETH/' + state.currency.toUpperCase(), ethData);

  } catch (err) {
    console.error('Error inicializando charts:', err);
  }
}

// --------------------
// Update prices every 5s and append point to charts
// --------------------
async function updateLiveAndAppend() {
  try {
    const live = await fetchLivePrices(state.currency);

    const btcPrice = Number(live.bitcoin[state.currency]);
    const btcChange = Number(live.bitcoin[`${state.currency}_24h_change`]) || Number(live.bitcoin[`${state.currency}_24h_change`]) || live.bitcoin[`${state.currency}_24h_change`] || 0;

    const ethPrice = Number(live.ethereum[state.currency]);
    const ethChange = Number(live.ethereum[`${state.currency}_24h_change`]) || 0;

    // Update DOM (prices + 24h change color)
    btcPriceEl.textContent = formatNumber(btcPrice, state.currency);
    ethPriceEl.textContent = formatNumber(ethPrice, state.currency);

    function setChangeEl(el, change) {
      const sign = (change >= 0) ? '+' : '';
      el.textContent = `${sign}${change.toFixed(2)}%`;
      el.style.color = (change >= 0) ? 'limegreen' : 'tomato';
    }
    setChangeEl(btcChangeEl, btcChange);
    setChangeEl(ethChangeEl, ethChange);

    // Append to charts (keep timestamps consistent)
    const nowTs = Date.now(); // ms
    // BTC
    if (btcChart) {
      const ds = btcChart.data.datasets[0].data;
      ds.push({ x: nowTs, y: btcPrice });
      // limit points
      if (ds.length > state.maxPoints) ds.shift();
      btcChart.update('none');
    }
    // ETH
    if (ethChart) {
      const ds2 = ethChart.data.datasets[0].data;
      ds2.push({ x: nowTs, y: ethPrice });
      if (ds2.length > state.maxPoints) ds2.shift();
      ethChart.update('none');
    }

  } catch (err) {
    console.error('Error updating live prices:', err);
  }
}

// --------------------
// UI events
// --------------------
document.addEventListener('DOMContentLoaded', async () => {
  // Sync mobile select with desktop select
  if (currencySelectMobile) {
    currencySelectMobile.value = state.currency;
    currencySelectMobile.addEventListener('change', (e) => {
      currencySelect.value = e.target.value;
      currencySelect.dispatchEvent(new Event('change'));
    });
  }

  // Toggle sidebar (hamburger)
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('show');
    });
  }

  // Sidebar links: active class toggle
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // if on mobile, close sidebar after click
      if (window.innerWidth <= 768) sidebarEl.classList.remove('show');
    });
  });

  // Change currency
  currencySelect.addEventListener('change', (e) => {
    state.currency = e.target.value;
    // reinitialize charts (so y-values use new currency scale) and update live values
    initCharts().then(() => updateLiveAndAppend()); 
  });

  // Change days range
  daysSelect.addEventListener('change', (e) => {
    state.days = Number(e.target.value);
    initCharts();
  });

  // initial load
  await initCharts();             // load 7/30 days historical series
  await updateLiveAndAppend();    // fetch current price and append to charts

  // then auto-update live prices every 5s (price, %24h and append point)
  setInterval(updateLiveAndAppend, 5000);
});

