# CryptoDash

Dashboard estático en español para seguir Bitcoin, Ethereum y BNB. HTML, CSS y JavaScript, sin compilación ni dependencias de ejecución de terceros para la interfaz o los gráficos.

## Abrir el proyecto

Abrí `index.html` en un navegador moderno. También podés servir la carpeta con cualquier servidor estático o GitHub Pages. Las cotizaciones requieren acceso a Internet y disponibilidad de CoinGecko; el diseño y la navegación funcionan sin esa API. La tipografía de Google Fonts tiene alternativas locales.

## Funciones

- Vista general con precio, cambio de 24 horas, capitalización y volumen.
- Selección de Bitcoin, Ethereum o BNB para el gráfico histórico.
- Períodos de 24 horas, 7 días y 30 días; variación, mínimo y máximo del período.
- Cotización en USD o EUR, con preferencia guardada en el navegador.
- Conversor con validación de cantidades y aviso cuando usa datos guardados.
- Historia de los tres activos, con enlaces a fuentes de sus proyectos.
- Diseño adaptable, navegación por teclado, estados accesibles y gráficos SVG con descripción textual.

## Datos y fallos del proveedor

Se utiliza la API pública de CoinGecko: `/simple/price` para cotizaciones y `/coins/{id}/market_chart` para historia. No se incluyen claves ni datos de ejemplo en la aplicación.

Las cotizaciones se consultan cada 60 segundos mientras la pestaña está visible. Se guardan en `localStorage` para reutilizarlas durante un minuto; el historial se reutiliza durante cinco minutos. Si falla una consulta, se indica el error y se conservan los últimos datos disponibles identificados como guardados. Las consultas tienen un límite de 12 segundos y los reintentos automáticos de cotizaciones se espacian progresivamente hasta cinco minutos. La actualización manual limita consultas consecutivas a una cada 15 segundos.

La API puede imponer límites, requerir cambios de acceso o devolver datos retrasados. El timestamp del proveedor se muestra en la página y las cotizaciones con más de cinco minutos se marcan como desactualizadas. El historial indica la fecha de su última muestra. La cifra del gráfico corresponde a esa muestra y puede diferir del precio actual de las tarjetas.

Los gráficos se vuelven a consultar al cambiar de activo, moneda o período. El conversor no incluye comisiones.

## Archivos

- `style.css`: toda la presentación visual y las reglas adaptables.
- `js/app.js`: consultas, caché, estados, cotizaciones, selección de moneda y conversor.
- `js/graficos.js`: historial, renderizado SVG y estadísticas del período.
- `index.html`, `pages/graficos.html`, `pages/historia.html`: páginas con navegación compartida.
- `image/`: imágenes originales de los activos.

## Referencias

- [CoinGecko: timestamps y precios desactualizados](https://support.coingecko.com/articles/7785031254-how-can-i-determine-if-the-pricing-data-for-the-coin-is-outdated-or-stale).
- [Bitcoin](https://bitcoin.org/es/).
- [Cronología de Ethereum](https://ethereum.org/es/ethereum-forks/).
- [BNB: evolución de Binance Chain y BNB Chain](https://www.bnbchain.org/en/blog/bsc-is-now-bnb-chain-the-infrastructure-for-the-metafi-universe).
