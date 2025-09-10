import express from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// ASAAS API configuration
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://sandbox.asaas.com/api/v3";

// ASAAS API client
async function asaasRequest(endpoint, options = {}) {
  const url = `${ASAAS_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ASAAS API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Mock users para simular autenticação
const mockUsers = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@vendeuonline.com",
    phone: "(11) 99999-9999",
    city: "São Paulo",
    state: "SP",
    userType: "admin",
  },
  {
    id: "2",
    name: "João Silva",
    email: "joao@gmail.com",
    phone: "(11) 88888-8888",
    city: "São Paulo",
    state: "SP",
    userType: "buyer",
  },
  {
    id: "3",
    name: "Maria Santos",
    email: "maria@techstore.com",
    phone: "(11) 77777-7777",
    city: "São Paulo",
    state: "SP",
    userType: "seller",
  },
];

// Mock plans
const mockPlans = [
  { id: "1", name: "Gratuito", price: 0 },
  { id: "2", name: "Micro Empresa", price: 29.9 },
  { id: "3", name: "Pequena Empresa", price: 59.9 },
  { id: "4", name: "Empresa Simples", price: 99.9 },
  { id: "5", name: "Empresa Plus", price: 199.9 },
];

// POST /api/payments/create - Criar pagamento
router.post("/create", async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;
    const authHeader = req.headers.authorization;

    if (!planId || !paymentMethod) {
      return res.status(400).json({
        error: "planId e paymentMethod são obrigatórios",
      });
    }

    // Verificar autenticação
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token de autenticação necessário",
      });
    }

    // Extrair e verificar JWT
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: "Token inválido",
      });
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({
        error: "Usuário não encontrado",
      });
    }

    // Buscar plano no banco de dados
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return res.status(404).json({
        error: "Plano não encontrado",
      });
    }

    try {
      // Criar ou buscar cliente no ASAAS
      let customer;
      try {
        // Tentar criar cliente (ASAAS permite duplicatas, então criamos sempre)
        customer = await asaasRequest("/customers", {
          method: "POST",
          body: JSON.stringify({
            name: user.name,
            email: user.email,
            phone: user.phone,
            cpfCnpj: user.cpf || "11144477735", // CPF do usuário ou exemplo
            city: user.city,
            state: user.state,
          }),
        });
      } catch (customerError) {
        console.warn("Erro ao criar cliente, tentando buscar existente:", customerError);

        // Tentar buscar cliente existente pelo email
        try {
          const existingCustomers = await asaasRequest(`/customers?email=${user.email}`);
          if (existingCustomers.data && existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
          } else {
            throw new Error("Cliente não encontrado");
          }
        } catch (searchError) {
          console.error("Erro ao buscar cliente existente:", searchError);
          return res.status(500).json({
            error: "Erro ao gerenciar cliente no sistema de pagamentos",
          });
        }
      }

      // Criar cobrança no ASAAS
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 dias para vencimento

      const chargeData = {
        customer: customer.id,
        billingType: paymentMethod.toUpperCase(),
        value: plan.price,
        dueDate: dueDate.toISOString().split("T")[0], // YYYY-MM-DD
        description: `Plano ${plan.name} - Vendeu Online`,
        externalReference: `plan_${planId}_${Date.now()}`,
      };

      const charge = await asaasRequest("/payments", {
        method: "POST",
        body: JSON.stringify(chargeData),
      });

      // Se for PIX, buscar QR Code
      let pixData = null;
      if (paymentMethod === "pix") {
        try {
          pixData = await asaasRequest(`/payments/${charge.id}/pixQrCode`);
        } catch (pixError) {
          console.warn("Erro ao buscar QR Code PIX:", pixError);
        }
      }

      // Retornar resposta baseada no método de pagamento
      const response = {
        success: true,
        charge_id: charge.id,
        payment_method: paymentMethod,
        invoice_url: charge.invoiceUrl,
        due_date: charge.dueDate,
        value: charge.value,
        status: charge.status,
      };

      if (paymentMethod === "pix" && pixData) {
        response.pix_qr_code = {
          encodedImage: pixData.encodedImage,
          payload: pixData.payload,
        };
      }

      return res.json(response);
    } catch (asaasError) {
      console.error("Erro na integração ASAAS:", asaasError);
      return res.status(500).json({
        error: "Erro ao processar pagamento com ASAAS",
      });
    }
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// POST /api/payments/webhook - Webhook do ASAAS
router.post("/webhook", (req, res) => {
  try {
    const webhookData = req.body;

    // Em produção, validar assinatura do webhook
    console.log("Webhook recebido:", webhookData);

    // Processar eventos de pagamento
    if (webhookData.event === "PAYMENT_RECEIVED") {
      console.log("Pagamento confirmado:", webhookData.payment);
      // Aqui atualizaria o status da assinatura no banco
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/payments/:id - Buscar pagamento
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;

    // Simular busca de pagamento
    const mockPayment = {
      id: id,
      status: "PENDING",
      amount: 59.9,
      createdAt: new Date().toISOString(),
      invoiceUrl: `https://sandbox.asaas.com/invoice/${id}`,
    };

    res.json(mockPayment);
  } catch (error) {
    console.error("Erro ao buscar pagamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

export default router;
