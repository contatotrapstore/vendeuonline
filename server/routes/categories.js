import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// GET /api/categories - Listar categorias
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json({ categories });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/categories/:slug - Buscar categoria por slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await prisma.categories.findFirst({
      where: { 
        slug,
        isActive: true 
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json(category);
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;