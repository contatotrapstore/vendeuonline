/**
 * Padrões de resposta para todas as APIs
 * Garantindo consistência em todas as rotas
 */

/**
 * Resposta de sucesso padrão
 */
export function createSuccessResponse(data, message = null, meta = {}) {
  return {
    success: true,
    data,
    ...(message && { message }),
    ...meta
  };
}

/**
 * Resposta de erro padrão
 */
export function createErrorResponse(error, statusCode = 500, details = null) {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message || 'Erro interno',
    statusCode,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Resposta paginada padrão
 */
export function createPaginatedResponse(data, pagination, meta = {}) {
  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
      ...(pagination.nextPage && { nextPage: pagination.nextPage }),
      ...(pagination.prevPage && { prevPage: pagination.prevPage })
    },
    ...meta
  };
}

/**
 * Resposta de validação de erro
 */
export function createValidationErrorResponse(errors) {
  return {
    success: false,
    error: 'Dados inválidos',
    statusCode: 400,
    details: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString()
  };
}

/**
 * Resposta de autenticação de erro
 */
export function createAuthErrorResponse(message = 'Não autorizado') {
  return {
    success: false,
    error: message,
    statusCode: 401,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resposta de não encontrado
 */
export function createNotFoundResponse(resource = 'Recurso') {
  return {
    success: false,
    error: `${resource} não encontrado`,
    statusCode: 404,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resposta de conflito
 */
export function createConflictResponse(message) {
  return {
    success: false,
    error: message,
    statusCode: 409,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resposta para operações de criação
 */
export function createCreatedResponse(data, message = 'Criado com sucesso') {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resposta para operações de atualização
 */
export function createUpdatedResponse(data, message = 'Atualizado com sucesso') {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resposta para operações de exclusão
 */
export function createDeletedResponse(message = 'Excluído com sucesso') {
  return {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Status codes padronizados
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500
};

/**
 * Middleware para padronizar respostas
 */
export function standardizeResponses() {
  return (req, res, next) => {
    // Helper methods no objeto response
    res.success = (data, message, meta) => {
      return res.json(createSuccessResponse(data, message, meta));
    };

    res.error = (error, statusCode = 500, details) => {
      return res.status(statusCode).json(createErrorResponse(error, statusCode, details));
    };

    res.paginated = (data, pagination, meta) => {
      return res.json(createPaginatedResponse(data, pagination, meta));
    };

    res.validationError = (errors) => {
      return res.status(HTTP_STATUS.VALIDATION_ERROR).json(createValidationErrorResponse(errors));
    };

    res.authError = (message) => {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(createAuthErrorResponse(message));
    };

    res.notFound = (resource) => {
      return res.status(HTTP_STATUS.NOT_FOUND).json(createNotFoundResponse(resource));
    };

    res.conflict = (message) => {
      return res.status(HTTP_STATUS.CONFLICT).json(createConflictResponse(message));
    };

    res.created = (data, message) => {
      return res.status(HTTP_STATUS.CREATED).json(createCreatedResponse(data, message));
    };

    res.updated = (data, message) => {
      return res.json(createUpdatedResponse(data, message));
    };

    res.deleted = (message) => {
      return res.json(createDeletedResponse(message));
    };

    next();
  };
}