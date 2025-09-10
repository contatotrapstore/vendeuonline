import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ orders: [], message: "Orders endpoint - implementar" });
});

export default router;
