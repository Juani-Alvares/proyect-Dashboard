const apiURL = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd&include_24hr_change=true";

    async function fetchPrices() {
      try {
        const response = await fetch(apiURL);
        const data = await response.json();

        // BTC
        document.getElementById("btc-price").textContent = `$${data.bitcoin.usd}`;
        const btcChange = data.bitcoin.usd_24h_change.toFixed(2);
        const btcChangeEl = document.getElementById("btc-change");
        btcChangeEl.textContent = `${btcChange}%`;
        btcChangeEl.style.color = btcChange >= 0 ? "green" : "red";

        // ETH
        document.getElementById("eth-price").textContent = `$${data.ethereum.usd}`;
        const ethChange = data.ethereum.usd_24h_change.toFixed(2);
        const ethChangeEl = document.getElementById("eth-change");
        ethChangeEl.textContent = `${ethChange}%`;
        ethChangeEl.style.color = ethChange >= 0 ? "green" : "red";

        // BNB
        document.getElementById("bnb-price").textContent = `$${data.binancecoin.usd}`;
        const bnbChange = data.binancecoin.usd_24h_change.toFixed(2);
        const bnbChangeEl = document.getElementById("bnb-change");
        bnbChangeEl.textContent = `${bnbChange}%`;
        bnbChangeEl.style.color = bnbChange >= 0 ? "green" : "red";
      } catch (error) {
        console.error("Error al obtener datos:", error);
      }
    }

    // Actualizacada 30 segundos
    fetchPrices();
    setInterval(fetchPrices, 30000);