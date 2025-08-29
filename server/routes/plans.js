import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/plans - Listar todos os planos
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        order: 'asc'
      }
    });

    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/plans/:id - Buscar plano por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.plan.findUnique({
      where: { id }
    });
    
    if (!plan) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});


export default router;