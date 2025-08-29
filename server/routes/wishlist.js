import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ wishlist: [], message: 'Wishlist endpoint - implementar' });
});

export default router;