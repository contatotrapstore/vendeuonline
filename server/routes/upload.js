import express from 'express';

const router = express.Router();

router.post('/', (req, res) => {
  res.json({ message: 'Upload endpoint - implementar' });
});

export default router;