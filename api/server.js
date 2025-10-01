import app from "../server.js";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

// Vercel serverless function handler
export default async function handler(req, res) {
  // Pass request to Express app
  return app(req, res);
}
