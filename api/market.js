export default async function handler(req, res) {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

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
