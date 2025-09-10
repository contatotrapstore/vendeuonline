/**
 * Classes de erro customizadas para o sistema
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Não autorizado") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Acesso negado") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(`${resource} não encontrado`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de dados") {
    super(message, 409, "CONFLICT_ERROR");
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Erro na base de dados", originalError = null) {
    super(message, 500, "DATABASE_ERROR");
    this.originalError = originalError;
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, message = "Serviço externo indisponível") {
    super(`${service}: ${message}`, 503, "EXTERNAL_SERVICE_ERROR");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Limite de requisições excedido") {
    super(message, 429, "RATE_LIMIT_ERROR");
  }
}

export class BusinessLogicError extends AppError {
  constructor(message, details = null) {
    super(message, 422, "BUSINESS_LOGIC_ERROR", details);
  }
}

/**
 * Factory para criar erros baseados em tipos comuns do Prisma
 */
export const createPrismaError = (error) => {
  if (error.code === "P2002") {
    return new ConflictError("Dados já existem no sistema");
  }

  if (error.code === "P2025") {
    return new NotFoundError();
  }

  if (error.code === "P2003") {
    return new ValidationError("Referência inválida");
  }

  if (error.code === "P1001") {
    return new DatabaseError("Não foi possível conectar com a base de dados");
  }

  return new DatabaseError("Erro na operação com a base de dados", error);
};

/**
 * Utilitários para validação
 */
export const validateRequired = (data, fields) => {
  const missing = fields.filter((field) => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Campos obrigatórios: ${missing.join(", ")}`);
  }
};

export const validateUUID = (id, fieldName = "ID") => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError(`${fieldName} deve ser um UUID válido`);
  }
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Email inválido");
  }
};

export const validatePhone = (phone) => {
  const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
  if (!phoneRegex.test(phone)) {
    throw new ValidationError("Telefone deve estar no formato (xx) xxxxx-xxxx");
  }
};
