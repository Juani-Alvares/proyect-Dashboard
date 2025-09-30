// app.js

async function getPrices() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd&include_24hr_change=true"
    );
    const data = await res.json();

    function updateCrypto(idPrice, idChange, value, change) {
      const priceEl = document.getElementById(idPrice);
      const changeEl = document.getElementById(idChange);
      if (!priceEl || !changeEl) {
        console.error("No existe el elemento con id:", idPrice, idChange);
        return;
      }

      priceEl.textContent = "$" + value.toLocaleString();

      if (change >= 0) {
        changeEl.textContent = "▲ " + change.toFixed(2) + "%";
        changeEl.style.color = "green";
      } else {
        changeEl.textContent = "▼ " + change.toFixed(2) + "%";
        changeEl.style.color = "red";
      }
    }

    updateCrypto("btc-price", "btc-change", data.bitcoin.usd, data.bitcoin.usd_24h_change);
    updateCrypto("eth-price", "eth-change", data.ethereum.usd, data.ethereum.usd_24h_change);
    updateCrypto("bnb-price", "bnb-change", data.binancecoin.usd, data.binancecoin.usd_24h_change);

  } catch (error) {
    console.error("Error al obtener precios:", error);
  }
}

// Ejecutar al cargar la página
getPrices();
// Repetir cada 5 segundos (5000 ms)
setInterval(getPrices, 5000);
