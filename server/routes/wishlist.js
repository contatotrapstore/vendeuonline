import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// JWT Secret (deve ser o mesmo usado em auth.js)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

// Middleware de autenticação opcional
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Sem token, continuar sem usuário autenticado
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Token inválido, continuar sem usuário autenticado
    req.user = null;
    next();
  }
};

// GET /api/wishlist - Buscar wishlist do usuário
router.get("/", optionalAuth, (req, res) => {
  // Se não está autenticado, retornar wishlist vazia
  if (!req.user) {
    return res.json({ 
      wishlist: [],
      message: "Faça login para ver sua lista de desejos" 
    });
  }

  // Por enquanto, retornar wishlist vazia para usuários autenticados
  // TODO: Implementar busca real no banco de dados
  return res.json({ 
    wishlist: [],
    message: "Wishlist do usuário",
    userId: req.user.userId
  });
});

// POST /api/wishlist - Adicionar item à wishlist
router.post("/", optionalAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: "Autenticação necessária para adicionar à wishlist" 
    });
  }

  const { productId } = req.body;
  
  if (!productId) {
    return res.status(400).json({ 
      error: "ID do produto é obrigatório" 
    });
  }

  // TODO: Implementar adição real ao banco de dados
  return res.json({ 
    success: true,
    message: "Produto adicionado à wishlist",
    productId
  });
});

// DELETE /api/wishlist/:productId - Remover item da wishlist
router.delete("/:productId", optionalAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: "Autenticação necessária para remover da wishlist" 
    });
  }

  const { productId } = req.params;

  // TODO: Implementar remoção real do banco de dados
  return res.json({ 
    success: true,
    message: "Produto removido da wishlist",
    productId
  });
});

export default router;