/**
 * Middleware para corrigir problemas de encoding UTF-8
 */

// Função para corrigir caracteres corrompidos
function fixEncoding(text) {
  if (typeof text !== 'string') return text;
  
  // Mapeamento simplificado de caracteres corrompidos
  const corrections = {
    // Replacement character genérico
    '�': 'ã',
    
    // Casos específicos mais comuns
    'Jo�o': 'João',
    'S�o Paulo': 'São Paulo',
    'eletr�nicos': 'eletrônicos',
    'pre�os': 'preços',
    '�nicos': 'únicos',
    '�nico': 'único',
    'solu��es': 'soluções',
    'informa��es': 'informações',
    'descri��o': 'descrição',
    'tradi��o': 'tradição',
    'promo��o': 'promoção',
    'atua��o': 'atuação',
    
    // Caracteres acentuados básicos
    'Ã¡': 'á',
    'Ã£': 'ã', 
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã§': 'ç',
  };

  let corrected = text;
  
  // Aplicar correções em ordem (específicas primeiro, depois genéricas)
  Object.keys(corrections).forEach(corrupt => {
    corrected = corrected.replace(new RegExp(corrupt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), corrections[corrupt]);
  });

  return corrected;
}

// Função recursiva para corrigir encoding em objetos
function fixObjectEncoding(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return fixEncoding(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => fixObjectEncoding(item));
  }
  
  if (typeof obj === 'object') {
    const fixed = {};
    Object.keys(obj).forEach(key => {
      const fixedKey = fixEncoding(key);
      fixed[fixedKey] = fixObjectEncoding(obj[key]);
    });
    return fixed;
  }
  
  return obj;
}

// Middleware para interceptar respostas JSON e corrigir encoding
export const fixEncodingMiddleware = (req, res, next) => {
  // Salvar referência original do método json
  const originalJson = res.json;
  
  // Sobrescrever método json
  res.json = function(data) {
    // Corrigir encoding dos dados antes de enviar
    const fixedData = fixObjectEncoding(data);
    
    // Garantir headers UTF-8
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Accept-Charset', 'utf-8');
    
    // Chamar método original com dados corrigidos
    return originalJson.call(this, fixedData);
  };
  
  next();
};

export default fixEncodingMiddleware;