   // Config gráficos
    const createChart = (ctx, label) => new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: label,
          data: [],
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { ticks: { color: '#000' } }
        }
      }
    });

    const btcChart = createChart(document.getElementById('btcChart'), 'BTC');
    const ethChart = createChart(document.getElementById('ethChart'), 'ETH');
    const bnbChart = createChart(document.getElementById('bnbChart'), 'BNB');

    // Función para actualizar precios y gráficos
    async function fetchPrices() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd');
        const data = await res.json();

        const btc = data.bitcoin.usd;
        const eth = data.ethereum.usd;
        const bnb = data.binancecoin.usd;

        document.getElementById('btc-price').innerText = `$${btc}`;
        document.getElementById('eth-price').innerText = `$${eth}`;
        document.getElementById('bnb-price').innerText = `$${bnb}`;

        const now = new Date().toLocaleTimeString();

        // Actualizar gráficos con nuevos valores
        [ [btcChart, btc], [ethChart, eth], [bnbChart, bnb] ].forEach(([chart, value]) => {
          chart.data.labels.push(now);
          chart.data.datasets[0].data.push(value);

          if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
          }

          chart.update();
        });

      } catch (error) {
        console.error("Error cargando precios:", error);
      }
    }

    // Llamada inicial
    fetchPrices();
    // Actualizar cada 5 segundos
    setInterval(fetchPrices, 5000);