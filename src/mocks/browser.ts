import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Configurar o service worker para interceptar requisições no navegador
export const worker = setupWorker(...handlers)