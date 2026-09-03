const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
 
  const validKey = process.env.PUBLIC_API_KEY || "dynamics-square-public-api-key-2024";

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ message: "Unauthorized: Invalid or missing API Key" });
  }

  next();
};

module.exports = { requireApiKey };
