/**
 * Utilitários de paginação global para padronizar todas as APIs
 */

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 12,
  maxLimit: 100
};

/**
 * Normaliza parâmetros de paginação
 */
export function normalizePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page) || DEFAULT_PAGINATION.page);
  const limit = Math.min(
    Math.max(1, parseInt(query.limit) || DEFAULT_PAGINATION.limit),
    DEFAULT_PAGINATION.maxLimit
  );
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
    // Para Supabase
    range: {
      from: offset,
      to: offset + limit - 1
    }
  };
}

/**
 * Calcula metadados de paginação
 */
export function calculatePaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
}

/**
 * Resposta padronizada para APIs paginadas
 */
export function createPaginatedResponse(data, total, page, limit, additionalMeta = {}) {
  const pagination = calculatePaginationMeta(total, page, limit);

  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      ...additionalMeta
    }
  };
}

/**
 * Query builder para Supabase com paginação
 */
export function applyPagination(query, pagination) {
  return query.range(pagination.range.from, pagination.range.to);
}

/**
 * Query builder para ordenação
 */
export function applySorting(query, sort = 'created_at', order = 'desc') {
  const validOrders = ['asc', 'desc'];
  const normalizedOrder = validOrders.includes(order?.toLowerCase())
    ? order.toLowerCase()
    : 'desc';

  return query.order(sort, { ascending: normalizedOrder === 'asc' });
}