export default async function handler(req, res) {
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
      if (!prices || prices.length < 5) {
        return {
          signal: "NO TRADE",
          confidence: 0,
          reason: "Insufficient data"
        };
      }

      const values = prices
        .map(Number)
        .filter(v => Number.isFinite(v));

      if (values.length < 5) {
        return {
          signal: "NO TRADE",
          confidence: 0,
          reason: "Invalid price data"
        };
      }

      const short = values.slice(-3);
      const long = values.slice(-5);

      const shortAverage =
        short.reduce((a, b) => a + b, 0) / short.length;

      const longAverage =
        long.reduce((a, b) => a + b, 0) / long.length;

      const last = values[values.length - 1];

      if (shortAverage > longAverage && last > shortAverage) {
        return {
          signal: "BUY",
          confidence: 70,
          reason: "Short-term trend is upward"
        };
      }

      if (shortAverage < longAverage && last < shortAverage) {
        return {
          signal: "SELL",
          confidence: 70,
          reason: "Short-term trend is downward"
        };
      }

      return {
        signal: "NO TRADE",
        confidence: 50,
        reason: "Trend is unclear"
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
