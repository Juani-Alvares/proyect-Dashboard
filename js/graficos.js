/* Historical SVG chart: no external chart library required. */
(() => {
  "use strict";
  const { state, coins, storage, request, money, change } = window.CryptoDash;
  const svg = document.querySelector("#price-chart");
  const area = document.querySelector("#chart-area");
  const message = document.querySelector("#chart-message");
  const status = document.querySelector("#chart-status");
  const retry = document.querySelector("#retry-chart");
  let days = 7,
    controller,
    version = 0,
    lastRequest = 0,
    visiblePoints = null;
  const ns = "http://www.w3.org/2000/svg";
  function node(name, attributes = {}, text) {
    const el = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attributes))
      el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function pointsFrom(data) {
    if (!Array.isArray(data?.prices)) return [];
    const unique = new Map(
      data.prices
        .filter(
          (p) =>
            Array.isArray(p) &&
            Number.isFinite(p[0]) &&
            p[0] > 0 &&
            Number.isFinite(p[1]) &&
            p[1] > 0,
        )
        .map((p) => [p[0], p[1]]),
    );
    return [...unique].sort((a, b) => a[0] - b[0]);
  }
  function rangeStats(min, max, count) {
    const low = document.querySelector("#range-min");
    if (!low) return;
    low.textContent = money(min);
    document.querySelector("#range-max").textContent = money(max);
    document.querySelector("#range-count").textContent = count
      ? count.toLocaleString("es-AR")
      : "—";
  }
  function render(points) {
    visiblePoints = points;
    const width = Math.max(340, Math.min(area.clientWidth, 1000));
    const plotEnd = width - 92;
    svg.setAttribute("viewBox", `0 0 ${width} 270`);
    const coin = coins.find((c) => c.id === state.coin);
    const values = points.map((p) => p[1]);
    const min = Math.min(...values),
      max = Math.max(...values);
    const first = points[0],
      last = points.at(-1);
    const delta = (last[1] / first[1] - 1) * 100;
    const padding = Math.max((max - min) * 0.15, max * 0.001);
    const low = min - padding,
      high = max + padding;
    const x = (t) =>
      8 + ((t - first[0]) / (last[0] - first[0])) * (plotEnd - 8);
    const y = (v) => 225 - ((v - low) / (high - low)) * 205;
    svg.replaceChildren();
    svg.append(
      node(
        "title",
        {},
        `${coin.name}: historial de ${days} ${days === 1 ? "día" : "días"}`,
      ),
    );
    svg.append(
      node(
        "desc",
        {},
        `Mínimo ${money(min)}, máximo ${money(max)}. Variación ${delta.toFixed(2)} por ciento. ${points.length} muestras.`,
      ),
    );
    const defs = node("defs");
    const gradient = node("linearGradient", {
      id: "chart-gradient",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    gradient.append(
      node("stop", {
        offset: "0%",
        "stop-color": "#efb85b",
        "stop-opacity": ".22",
      }),
      node("stop", {
        offset: "100%",
        "stop-color": "#efb85b",
        "stop-opacity": "0",
      }),
    );
    defs.append(gradient);
    svg.append(defs);
    for (let i = 0; i < 5; i++) {
      const value = low + ((high - low) * i) / 4,
        pos = y(value);
      svg.append(
        node("line", {
          x1: 8,
          x2: plotEnd,
          y1: pos,
          y2: pos,
          class: "chart-grid",
        }),
      );
      svg.append(
        node(
          "text",
          { x: plotEnd + 12, y: pos + 4, class: "chart-axis" },
          new Intl.NumberFormat("es-AR", {
            maximumFractionDigits: high < 10 ? 4 : high < 100 ? 2 : 0,
          }).format(value),
        ),
      );
    }
    const line = points
      .map(
        ([t, v], index) =>
          `${index ? "L" : "M"}${x(t).toFixed(2)},${y(v).toFixed(2)}`,
      )
      .join(" ");
    svg.append(
      node("path", {
        d: `${line} L${plotEnd},225 L8,225 Z`,
        class: "chart-fill",
      }),
    );
    svg.append(node("path", { d: line, class: "chart-line" }));
    for (let i = 0; i < 5; i++) {
      const t = first[0] + ((last[0] - first[0]) * i) / 4;
      const label = new Date(t).toLocaleString(
        "es-AR",
        days === 1
          ? { hour: "2-digit", minute: "2-digit" }
          : { day: "2-digit", month: "short" },
      );
      svg.append(
        node(
          "text",
          {
            x: x(t),
            y: 258,
            class: "chart-axis",
            "text-anchor": i === 0 ? "start" : i === 4 ? "end" : "middle",
          },
          label,
        ),
      );
    }
    svg.hidden = false;
    svg.removeAttribute("hidden");
    message.hidden = true;
    document.querySelector("#chart-price").textContent = money(last[1]);
    change(document.querySelector("#chart-change"), delta);
    rangeStats(min, max, points.length);
  }
  async function load() {
    visiblePoints = null;
    const current = ++version;
    controller?.abort();
    controller = new AbortController();
    const coin = coins.find((c) => c.id === state.coin);
    document
      .querySelector("#chart-title")
      .replaceChildren(document.createTextNode(`${coin.name} `));
    const ticker = document.createElement("span");
    ticker.textContent = coin.symbol;
    document.querySelector("#chart-title").append(ticker);
    const key = `chart:${coin.id}:${state.currency}:${days}`;
    const cache = storage.get(key);
    const cachedPoints = pointsFrom(cache?.data);
    const hasCache = cachedPoints.length > 1 && Number.isFinite(cache?.time);
    area.setAttribute("aria-busy", "true");
    retry.hidden = true;
    document.querySelector("#chart-price").textContent = "—";
    change(document.querySelector("#chart-change"), NaN);
    rangeStats(NaN, NaN, 0);
    if (hasCache) {
      render(cachedPoints);
      status.textContent = `Historial guardado · ${new Date(cache.time).toLocaleString("es-AR")}`;
      if (Date.now() - cache.time < 5 * 60000) {
        area.setAttribute("aria-busy", "false");
        return;
      }
    } else {
      svg.setAttribute("hidden", "");
      message.hidden = false;
      message.textContent = "Cargando historial…";
      status.textContent = "Consultando datos históricos";
    }
    lastRequest = Date.now();
    try {
      const data = await request(
        `coins/${coin.id}/market_chart?vs_currency=${state.currency}&days=${days}`,
        controller.signal,
      );
      if (current !== version) return;
      const points = pointsFrom(data);
      if (points.length < 2)
        throw new Error("El proveedor no devolvió suficiente historial.");
      storage.set(key, { data: { prices: points }, time: Date.now() });
      render(points);
      const last = new Date(points.at(-1)[0]);
      status.textContent = `CoinGecko · Última muestra: ${last.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
      if (current !== version) return;
      if (!hasCache) {
        svg.setAttribute("hidden", "");
        message.hidden = false;
        message.textContent =
          "No pudimos cargar el historial. Podés volver a intentarlo.";
      }
      status.textContent = hasCache
        ? `Sin conexión con el proveedor · Historial guardado el ${new Date(cache.time).toLocaleString("es-AR")}`
        : error.status === 429
          ? "Límite de consultas. Esperá un minuto antes de reintentar."
          : "Historial no disponible. Las cotizaciones se consultan por separado.";
      retry.hidden = false;
    } finally {
      if (current === version) area.setAttribute("aria-busy", "false");
    }
  }
  document.querySelectorAll("[data-days]").forEach((button) =>
    button.addEventListener("click", () => {
      if (days === Number(button.dataset.days)) return;
      days = Number(button.dataset.days);
      document.querySelectorAll("[data-days]").forEach((el) => {
        const selected = Number(el.dataset.days) === days;
        el.classList.toggle("active", selected);
        el.setAttribute("aria-pressed", String(selected));
      });
      load();
    }),
  );
  retry.addEventListener("click", () => {
    if (Date.now() - lastRequest < 15000) {
      status.textContent = "Esperá unos segundos antes de reintentar.";
      return;
    }
    load();
  });
  window.addEventListener("crypto:coin", load);
  window.addEventListener("crypto:currency", load);
  let lastWidth = 0;
  new ResizeObserver(() => {
    if (area.clientWidth === lastWidth) return;
    lastWidth = area.clientWidth;
    if (visiblePoints) render(visiblePoints);
  }).observe(area);
  load();
})();
