import { NextRequest, NextResponse } from 'next/server';

// Token de verificação do webhook (deve ser configurado no Facebook Developer)
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

// GET - Verificação do webhook pelo Facebook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verificar se é uma requisição de verificação válida
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook do WhatsApp verificado com sucesso');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('Falha na verificação do webhook do WhatsApp');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST - Receber mensagens e status do WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook WhatsApp recebido:', JSON.stringify(body, null, 2));

    // Verificar se há entradas no webhook
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        // Processar mudanças nas mensagens
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await processMessageChange(change.value);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Erro no webhook do WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Processar mudanças nas mensagens
async function processMessageChange(value: any) {
  console.log('Processando mudança de mensagem:', value);

  // Processar mensagens recebidas
  if (value.messages) {
    for (const message of value.messages) {
      await processIncomingMessage(message, value.contacts?.[0]);
    }
  }

  // Processar status de mensagens enviadas
  if (value.statuses) {
    for (const status of value.statuses) {
      await processMessageStatus(status);
    }
  }
}

// Processar mensagem recebida
async function processIncomingMessage(message: any, contact: any) {
  console.log('Mensagem recebida:', {
    id: message.id,
    from: message.from,
    type: message.type,
    timestamp: message.timestamp
  });

  const phoneNumber = message.from;
  const messageId = message.id;
  const messageType = message.type;
  
  // Extrair o conteúdo da mensagem baseado no tipo
  let messageContent = '';
  
  switch (messageType) {
    case 'text':
      messageContent = message.text?.body || '';
      break;
    case 'image':
      messageContent = message.image?.caption || '[Imagem]';
      break;
    case 'document':
      messageContent = message.document?.caption || '[Documento]';
      break;
    case 'audio':
      messageContent = '[Áudio]';
      break;
    case 'video':
      messageContent = message.video?.caption || '[Vídeo]';
      break;
    default:
      messageContent = `[${messageType}]`;
  }

  // Aqui você pode implementar lógica para:
  // 1. Salvar a mensagem no banco de dados
  // 2. Processar comandos automáticos
  // 3. Encaminhar para atendimento humano
  // 4. Responder automaticamente

  // Exemplo de resposta automática simples
  if (messageContent.toLowerCase().includes('pedido') || 
      messageContent.toLowerCase().includes('status')) {
    await sendAutoReply(phoneNumber, 
      'Olá! Recebemos sua mensagem. Para consultar o status do seu pedido, acesse nosso site ou aguarde que nossa equipe entrará em contato. 😊'
    );
  }

  // Log para debug
  console.log(`Mensagem de ${phoneNumber}: ${messageContent}`);
}

// Processar status de mensagem enviada
async function processMessageStatus(status: any) {
  console.log('Status da mensagem:', {
    id: status.id,
    status: status.status,
    timestamp: status.timestamp,
    recipient_id: status.recipient_id
  });

  const messageId = status.id;
  const messageStatus = status.status; // sent, delivered, read, failed
  const recipientId = status.recipient_id;

  // Aqui você pode:
  // 1. Atualizar o status da mensagem no banco de dados
  // 2. Notificar o sistema sobre falhas de entrega
  // 3. Gerar relatórios de entrega

  switch (messageStatus) {
    case 'sent':
      console.log(`Mensagem ${messageId} enviada para ${recipientId}`);
      break;
    case 'delivered':
      console.log(`Mensagem ${messageId} entregue para ${recipientId}`);
      break;
    case 'read':
      console.log(`Mensagem ${messageId} lida por ${recipientId}`);
      break;
    case 'failed':
      console.error(`Falha ao enviar mensagem ${messageId} para ${recipientId}`);
      // Implementar lógica de retry ou notificação de erro
      break;
  }
}

// Enviar resposta automática
async function sendAutoReply(to: string, message: string) {
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        message,
        type: 'text'
      })
    });

    if (!response.ok) {
      console.error('Erro ao enviar resposta automática:', await response.text());
    }
  } catch (error) {
    console.error('Erro ao enviar resposta automática:', error);
  }
}