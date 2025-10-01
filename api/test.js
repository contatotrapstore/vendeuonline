// Função serverless mínima para testar Vercel
export default function handler(req, res) {
  res.status(200).json({
    status: "OK",
    message: "Vercel serverless function is working! 🎉",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    environment: process.env.NODE_ENV || "unknown",
  });
}
