import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import { logger } from "../lib/logger.js";


// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3002;

// Middlewares
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requisições sem origin (ex: Postman, curl) e qualquer localhost em desenvolvimento
      if (!origin || origin.startsWith("http://localhost:")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rotas das APIs
import productsRouter from "./routes/products.js";
import authRouter from "./routes/auth.js";
import storesRouter from "./routes/stores.js";
import ordersRouter from "./routes/orders.js";
import uploadRouter from "./routes/upload.js";
import categoriesRouter from "./routes/categories.js";
import reviewsRouter from "./routes/reviews.js";
import wishlistRouter from "./routes/wishlist.js";
import paymentsRouter from "./routes/payments.js";
import plansRouter from "./routes/plans.js";

// Registrar rotas
app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);
app.use("/api/stores", storesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/plans", plansRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API Vendeu Online funcionando" });
});

// Rota padrão
app.get("/", (req, res) => {
  res.json({
    message: "API Vendeu Online",
    version: "1.0.0",
    endpoints: [
      "/api/products",
      "/api/auth",
      "/api/stores",
      "/api/orders",
      "/api/upload",
      "/api/categories",
      "/api/reviews",
      "/api/wishlist",
      "/api/payments",
      "/api/plans",
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint não encontrado",
    path: req.originalUrl,
  });
});

// Este arquivo server/index.js não é mais usado - movido para server.js principal
// Manter apenas para referência - remover depois

export default app;
