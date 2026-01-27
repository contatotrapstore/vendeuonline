import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Corrige problemas de encoding UTF-8 em strings
 * @param text - Texto a ser corrigido
 * @returns Texto com caracteres corrigidos
 */
export function fixEncoding(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return text || '';
  
  // Mapeamento de caracteres corrompidos mais comuns
  const corrections: Record<string, string> = {
    // Replacement character genérico
    '�': 'ã',
    
    // Casos específicos observados
    'Jo�o': 'João',
    '�nicos': 'únicos',
    '�nico': 'único',
    'S�o Paulo': 'São Paulo',
    'eletr�nicos': 'eletrônicos',
    'pre�os': 'preços',
    'solu��es': 'soluções',
    'informa��es': 'informações',
    'descri��o': 'descrição',
    'tradi��o': 'tradição',
    'promo��o': 'promoção',
    'atua��o': 'atuação',
    
    // Caracteres acentuados comuns corrompidos
    'Ã¡': 'á', 'Ã ': 'à', 'Ã£': 'ã', 'Ã¢': 'â',
    'Ã©': 'é', 'Ãª': 'ê', 'Ã¨': 'è',
    'Ã­': 'í', 'Ã®': 'î', 'Ã¬': 'ì',
    'Ã³': 'ó', 'Ã´': 'ô', 'Ã²': 'ò', 'Ãµ': 'õ',
    'Ãº': 'ú', 'Ã»': 'û', 'Ã¹': 'ù',
    'Ã§': 'ç', 'Ã±': 'ñ',
  };

  let corrected = text;
  
  // Aplicar correções
  Object.entries(corrections).forEach(([corrupt, fixed]) => {
    corrected = corrected.replace(new RegExp(corrupt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixed);
  });

  return corrected;
}

/**
 * Corrige encoding em objetos recursivamente
 * @param obj - Objeto a ser corrigido
 * @returns Objeto com strings corrigidas
 */
export function fixObjectEncoding<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return fixEncoding(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => fixObjectEncoding(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const fixed: any = {};
    Object.entries(obj as any).forEach(([key, value]) => {
      const fixedKey = fixEncoding(key);
      fixed[fixedKey] = fixObjectEncoding(value);
    });
    return fixed as T;
  }
  
  return obj;
}
