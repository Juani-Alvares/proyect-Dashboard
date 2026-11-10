/* Shared market state. No prices are fabricated when the API is unavailable. */
(() => {
  "use strict";
  const coins = [
    { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
    { id: "ethereum", name: "Ethereum", symbol: "ETH" },
    { id: "binancecoin", name: "BNB", symbol: "BNB" },
  ];
  const storage = {
    get(key) {
      try {
        return JSON.parse(localStorage.getItem(`cryptodash:${key}`));
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`cryptodash:${key}`, JSON.stringify(value));
      } catch {
        /* Private browsing still works. */
      }
    },
  };
  const savedCurrency = storage.get("currency");
  const state = {
    currency: ["usd", "eur"].includes(savedCurrency) ? savedCurrency : "usd",
    coin: "bitcoin",
    prices: null,
    stale: false,
  };
  const money = (value, compact = false) =>
    Number.isFinite(value)
      ? new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: state.currency.toUpperCase(),
          notation: compact ? "compact" : "standard",
          maximumFractionDigits: compact ? 1 : 2,
        }).format(value)
      : "—";
  const percent = (value) =>
    Number.isFinite(value)
      ? `${value > 0 ? "+" : ""}${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
      : "—";
  function change(el, value) {
    el.textContent = Number.isFinite(value)
      ? `${value > 0 ? "↗ " : value < 0 ? "↘ " : ""}${percent(value)}`
      : "—";
    el.classList.toggle("positive", Number.isFinite(value) && value > 0);
    el.classList.toggle("negative", Number.isFinite(value) && value < 0);
  }
  async function request(path, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 12000);
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/${path}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error(
          response.status === 429
            ? "El proveedor alcanzó su límite de consultas. Probá de nuevo en un minuto."
            : "El proveedor no está disponible. Intentá de nuevo más tarde.",
        );
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  function emit(name) {
    window.dispatchEvent(new CustomEvent(`crypto:${name}`, { detail: state }));
  }
  window.CryptoDash = {
    coins,
    state,
    storage,
    money,
    percent,
    change,
    request,
    emit,
  };
  if (document.body.dataset.page === "history") return;

  const currencySelect = document.querySelector("#currency");
  const refresh = document.querySelector("#refresh");
  const status = document.querySelector("#data-status");
  let controller,
    version = 0,
    lastAttempt = 0,
    retryDelay = 60000;
  currencySelect.value = state.currency;
  function setStatus(text, kind = "") {
    status.textContent = text;
    status.parentElement.classList.toggle("error", kind === "error");
    status.parentElement.classList.toggle("stale", kind === "stale");
  }
  function validPrices(data, currency) {
    return (
      data &&
      coins.every(
        (coin) =>
          Number.isFinite(data[coin.id]?.[currency]) &&
          data[coin.id][currency] > 0,
      )
    );
  }
  function renderPrices() {
    for (const coin of coins) {
      const quote = state.prices?.[coin.id];
      const value = quote?.[state.currency];
      document.querySelectorAll(`[data-price="${coin.id}"]`).forEach((el) => {
        el.textContent = money(value);
      });
      document
        .querySelectorAll(`[data-change="${coin.id}"]`)
        .forEach((el) => change(el, quote?.[`${state.currency}_24h_change`]));
      document.querySelectorAll(`[data-cap="${coin.id}"]`).forEach((el) => {
        el.textContent = money(quote?.[`${state.currency}_market_cap`], true);
      });
      document.querySelectorAll(`[data-volume="${coin.id}"]`).forEach((el) => {
        el.textContent = money(quote?.[`${state.currency}_24h_vol`], true);
      });
    }
    renderConversion();
    emit("prices");
  }
  function renderConversion() {
    const amount = document.querySelector("#amount");
    if (!amount) return;
    const number = amount.valueAsNumber;
    const invalid =
      amount.value === "" || !Number.isFinite(number) || number < 0;
    amount.setAttribute("aria-invalid", String(invalid));
    const quote =
      state.prices?.[document.querySelector("#convert-coin").value]?.[
        state.currency
      ];
    document.querySelector("#convert-currency").textContent =
      state.currency.toUpperCase();
    const result = document.querySelector("#convert-result");
    result.textContent = invalid
      ? "Cantidad inválida"
      : money(Number.isFinite(quote) ? number * quote : NaN);
    const note = document.querySelector("#convert-note");
    note.textContent = invalid
      ? "Ingresá una cantidad mayor o igual a cero."
      : !Number.isFinite(quote)
        ? "Esperando una cotización para convertir."
        : state.stale
          ? "Estimación con datos guardados o desactualizados. No incluye comisiones."
          : "Se calcula con la última cotización disponible. No incluye comisiones.";
  }
  function describeTime() {
    const timestamps = coins
      .map((coin) => state.prices?.[coin.id]?.last_updated_at)
      .filter((t) => Number.isFinite(t) && t > 0);
    if (!timestamps.length) return "Hora del proveedor no disponible";
    const oldest = Math.min(...timestamps) * 1000;
    const today = new Date(oldest).toDateString() === new Date().toDateString();
    return `Datos del ${new Date(oldest).toLocaleString("es-AR", today ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  }
  function isStale() {
    return coins.some(
      (coin) =>
        !Number.isFinite(state.prices?.[coin.id]?.last_updated_at) ||
        Date.now() - state.prices[coin.id].last_updated_at * 1000 > 5 * 60000,
    );
  }
  async function loadPrices(force = false) {
    const current = ++version;
    controller?.abort();
    controller = new AbortController();
    const currency = state.currency;
    const cache = storage.get(`prices:${currency}`);
    if (validPrices(cache?.data, currency) && Number.isFinite(cache.time)) {
      state.prices = cache.data;
      state.stale = true;
      renderPrices();
      setStatus(`Datos guardados · ${describeTime()}`, "stale");
      if (!force && Date.now() - cache.time < 60000) {
        refresh.disabled = false;
        refresh.setAttribute("aria-busy", "false");
        return;
      }
    }
    lastAttempt = Date.now();
    refresh.disabled = true;
    refresh.setAttribute("aria-busy", "true");
    setStatus(
      state.prices
        ? `Actualizando · ${describeTime()}`
        : "Consultando cotizaciones…",
    );
    try {
      const data = await request(
        `simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`,
        controller.signal,
      );
      if (current !== version) return;
      if (!validPrices(data, currency))
        throw new Error("El proveedor devolvió datos incompletos.");
      state.prices = data;
      state.stale = isStale();
      storage.set(`prices:${currency}`, { data, time: Date.now() });
      retryDelay = 60000;
      renderPrices();
      setStatus(
        `${describeTime()} · ${state.stale ? "Cotización desactualizada" : "CoinGecko"}`,
        state.stale ? "stale" : "",
      );
    } catch (error) {
      if (current !== version) return;
      state.stale = true;
      renderPrices();
      retryDelay = Math.min(retryDelay * 2, 300000);
      const message =
        error.name === "AbortError"
          ? "La consulta tardó demasiado."
          : error.message === "Failed to fetch"
            ? "No se pudo conectar con el proveedor."
            : error.message;
      setStatus(
        state.prices
          ? `${message} Se conservan datos guardados · ${describeTime()}`
          : `${message} Usá Actualizar para reintentar.`,
        "error",
      );
    } finally {
      if (current === version) {
        refresh.disabled = false;
        refresh.setAttribute("aria-busy", "false");
      }
    }
  }
  refresh.addEventListener("click", () => {
    if (Date.now() - lastAttempt < 15000) {
      setStatus(
        "Esperá unos segundos entre consultas para evitar el límite del proveedor.",
        "stale",
      );
      return;
    }
    loadPrices(true);
  });
  currencySelect.addEventListener("change", () => {
    state.currency = currencySelect.value;
    storage.set("currency", state.currency);
    state.prices = null;
    state.stale = false;
    renderPrices();
    emit("currency");
    loadPrices();
  });
  document.querySelectorAll("[data-select-coin]").forEach((button) =>
    button.addEventListener("click", () => {
      state.coin = button.dataset.selectCoin;
      document.querySelectorAll(".coin-card").forEach((card) => {
        const selected = card.dataset.selectCoin === state.coin;
        card.classList.toggle("active", selected);
        card.setAttribute("aria-pressed", String(selected));
      });
      emit("coin");
      if (button.classList.contains("table-action"))
        document
          .querySelector(".chart-panel")
          .scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
            block: "start",
          });
    }),
  );
  document
    .querySelector("#amount")
    ?.addEventListener("input", renderConversion);
  document
    .querySelector("#convert-coin")
    ?.addEventListener("change", renderConversion);
  setInterval(() => {
    if (
      !document.hidden &&
      Date.now() - lastAttempt >= retryDelay &&
      !refresh.disabled
    )
      loadPrices(true);
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (
      !document.hidden &&
      Date.now() - lastAttempt >= retryDelay &&
      !refresh.disabled
    )
      loadPrices();
  });
  loadPrices();
})();
