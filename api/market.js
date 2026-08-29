export default async function handler(req, res) {
  try {
    const apiKey = process.env.TWELVE_DATA
    if (!apiKey) {
      return res.status(500).json({
        error: "TWELVE_DATA_API_KEY is not configured"
      });
    }

    const symbols = {
      gold: "XAU/USD",
      oil: "WTI/USD",
      eurusd: "EUR/USD"
    };

    const results = {};

   for (const [name, symbol] of Object.entries(symbols)) {

  if (name === "oil") {
    const oilApiKey = process.env.OIL_PRICE_API_KEY;

    if (!oilApiKey) {
      results[name] = {
        symbol,
        error: "OIL_PRICE_API_KEY is not configured"
      };
      continue;
    }

    const oilResponse = await fetch(
      "https://api.oilpriceapi.com/v1/prices/latest",
      {
        headers: {
          Authorization: `Token ${oilApiKey}`
        }
      }
    );

    const oilData = await oilResponse.json();

    if (!oilResponse.ok) {
      results[name] = {
        symbol,
        error: oilData.message || "OilPriceAPI request failed"
      };
    } else {
      const price =
        oilData?.data?.price ??
        oilData?.price ??
        null;

      results[name] = {
        symbol: "WTI/USD",
        price
      };
    }

    continue;
  }

  const url =
    `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.status === "error") {
    results[name] = {
      symbol,
      error: data.message || "API request failed"
    };
  } else {
    results[name] = {
      symbol,
      price: data.price
    };
  }
}

    return res.status(200).json({
      success: true,
      data: results,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
