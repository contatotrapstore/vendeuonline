/**
 * Endpoint de notificações (stub)
 * Retorna lista vazia de notificações até implementação completa
 * Previne erro 404 no frontend
 */
export default function handler(req, res) {
  // Permitir apenas GET
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  // Retornar array vazio de notificações
  return res.status(200).json({
    success: true,
    notifications: [],
    message: "Notification system not implemented yet",
  });
}
