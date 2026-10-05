export default async function handler(req, res) { {
  try {
    const apiKey = process.env.TWELVE_DATA;
    const oilApiKey = process.env.OIL_PRICE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "TWELVE_DATA is not configured"
      });
    }

    if (!oilApiKey) {
      return res.status(500).json({
        success: false,
        error: "OIL_PRICE_API_KEY is not configured"
      });
    }

    const markets = {
      gold: {
        symbol: "XAU/USD",
        source: "twelvedata"
      },
      eurusd: {
        symbol: "EUR/USD",
        source: "twelvedata"
      },
      oil: {
        symbol: "WTI/USD",
        source: "oilpriceapi"
      }
    };

    const signals = {};

    // محاسبه سیگنال بر اساس روند کوتاه‌مدت
    function calculateSignal(prices) {
      function calculateSignal(prices) {
  if (!prices || prices.length < 15) {
    return {
      signal: "NO TRADE",
      confidence: 0,
      reason: "Insufficient data"
    };
  }

  const values = prices
    .map(Number)
    .filter(v => Number.isFinite(v));

  if (values.length < 15) {
    return {
      signal: "NO TRADE",
      confidence: 0,
      reason: "Insufficient valid price data"
    };
  }

  // EMA
  function calculateEMA(data, period) {
    const multiplier = 2 / (period + 1);
    let ema = data[0];

    for (let i = 1; i < data.length; i++) {
      ema =
        (data[i] - ema) * multiplier +
        ema;
    }

    return ema;
  }

  // RSI
  function calculateRSI(data, period = 14) {
    if (data.length <= period) {
      return 50;
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = data[i] - data[i - 1];

      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];

      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      averageGain =
        ((averageGain * (period - 1)) + gain) / period;

      averageLoss =
        ((averageLoss * (period - 1)) + loss) / period;
    }

    if (averageLoss === 0) {
      return 100;
    }

    const rs = averageGain / averageLoss;

    return 100 - (100 / (1 + rs));
  }

  const lastPrice = values[values.length - 1];

  const ema9 = calculateEMA(values, 9);
  const ema14 = calculateEMA(values, 14);
  const rsi = calculateRSI(values, 14);

  let score = 0;

  // EMA trend
  if (ema9 > ema14) {
    score += 1;
  } else if (ema9 < ema14) {
    score -= 1;
  }

  // Price position
  if (lastPrice > ema9) {
    score += 1;
  } else if (lastPrice < ema9) {
    score -= 1;
  }

  // RSI
  if (rsi >= 55 && rsi < 70) {
    score += 1;
  } else if (rsi <= 45 && rsi > 30) {
    score -= 1;
  }

  // Strong overbought / oversold conditions
  if (rsi >= 70) {
    score -= 1;
  }

  if (rsi <= 30) {
    score += 1;
  }

  let signal = "NO TRADE";
  let confidence = 50;
  let reason = "Trend is unclear";

  if (score >= 3) {
    signal = "BUY";
    confidence = 80;
    reason = "Bullish EMA trend with supportive RSI";
  } else if (score === 2) {
    signal = "BUY";
    confidence = 70;
    reason = "Short-term bullish trend";
  } else if (score <= -3) {
    signal = "SELL";
    confidence = 80;
    reason = "Bearish EMA trend with supportive RSI";
  } else if (score === -2) {
    signal = "SELL";
    confidence = 70;
    reason = "Short-term bearish trend";
  }

  return {
    signal,
    confidence,
    reason,
    indicators: {
      price: Number(lastPrice.toFixed(5)),
      ema9: Number(ema9.toFixed(5)),
      ema14: Number(ema14.toFixed(5)),
      rsi: Number(rsi.toFixed(2))
    }
  };
}

    // دریافت داده تاریخی از Twelve Data
    async function getTwelveData(symbol) {
      const url =
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1h&outputsize=20&apikey=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.status === "error") {
        throw new Error(
          data.message || `Twelve Data error for ${symbol}`
        );
      }

      if (!data.values || !Array.isArray(data.values)) {
        throw new Error(`No historical data for ${symbol}`);
      }

      return data.values
        .reverse()
        .map(item => Number(item.close))
        .filter(v => Number.isFinite(v));
    }

    // دریافت تاریخچه کوتاه‌مدت نفت WTI از OilPriceAPI
async function getOilData() {
  const response = await fetch(
    "https://api.oilpriceapi.com/v1/prices/past_day?by_code=WTI_USD",
    {
      headers: {
        Authorization: `Token ${oilApiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  const data = await response.json();

  if (!response.ok || data.status === "error") {
    throw new Error(
      data.message || "OilPriceAPI historical data request failed"
    );
  }

  let values = [];

  if (Array.isArray(data?.data)) {
    values = data.data;
  } else if (Array.isArray(data?.data?.prices)) {
    values = data.data.prices;
  } else if (Array.isArray(data?.prices)) {
    values = data.prices;
  }

  const prices = values
    .map(item => {
      if (typeof item === "number") return item;
      return Number(item?.price ?? item?.close);
    })
    .filter(v => Number.isFinite(v));

  if (prices.length < 5) {
    throw new Error("Not enough historical WTI data");
  }

  return prices;
}

    // طلا
    try {
      const prices = await getTwelveData("XAU/USD");

      signals.gold = {
        symbol: "XAU/USD",
        ...calculateSignal(prices)
      };
    } catch (error) {
      signals.gold = {
        symbol: "XAU/USD",
        signal: "NO TRADE",
        confidence: 0,
        error: error.message
      };
    }

    // EUR/USD
    try {
      const prices = await getTwelveData("EUR/USD");

      signals.eurusd = {
        symbol: "EUR/USD",
        ...calculateSignal(prices)
      };
    } catch (error) {
      signals.eurusd = {
        symbol: "EUR/USD",
        signal: "NO TRADE",
        confidence: 0,
        error: error.message
      };
    }

    // نفت
    try {
      const prices = await getOilData();

      signals.oil = {
        symbol: "WTI/USD",
        ...calculateSignal(prices)
      };
    } catch (error) {
      signals.oil = {
        symbol: "WTI/USD",
        signal: "NO TRADE",
        confidence: 0,
        error: error.message
      };
    }

    return res.status(200).json({
      success: true,
      mode: "DEMO",
      signals,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
