import crypto from "crypto";

// Configuração da API ASAAS
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN!;

// Tipos e interfaces
export interface AsaasCustomer {
  id?: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface AsaasCharge {
  id?: string;
  customer: string; // Customer ID
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  status?:
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "OVERDUE"
    | "REFUNDED"
    | "RECEIVED_IN_CASH"
    | "REFUND_REQUESTED"
    | "CHARGEBACK_REQUESTED"
    | "CHARGEBACK_DISPUTE"
    | "AWAITING_CHARGEBACK_REVERSAL"
    | "DUNNING_REQUESTED"
    | "DUNNING_RECEIVED"
    | "AWAITING_RISK_ANALYSIS";
  paymentDate?: string;
  discount?: {
    value: number;
    dueDateLimitDays: number;
  };
  fine?: {
    value: number;
  };
  interest?: {
    value: number;
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
}

export interface AsaasCreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasWebhookEvent {
  id: string;
  dateCreated: string;
  event: string;
  payment: {
    object: string;
    id: string;
    dateCreated: string;
    customer: string;
    paymentLink?: string;
    value: number;
    netValue: number;
    originalValue?: number;
    interestValue?: number;
    description: string;
    billingType: string;
    pixTransaction?: any;
    status:
      | "PENDING"
      | "RECEIVED"
      | "CONFIRMED"
      | "OVERDUE"
      | "REFUNDED"
      | "RECEIVED_IN_CASH"
      | "REFUND_REQUESTED"
      | "CHARGEBACK_REQUESTED"
      | "CHARGEBACK_DISPUTE"
      | "AWAITING_CHARGEBACK_REVERSAL"
      | "DUNNING_REQUESTED"
      | "DUNNING_RECEIVED"
      | "AWAITING_RISK_ANALYSIS";
    dueDate: string;
    originalDueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installmentNumber?: number;
    invoiceUrl: string;
    bankSlipUrl?: string;
    transactionReceiptUrl?: string;
    invoiceNumber: string;
    externalReference?: string;
    deleted: boolean;
    anticipated: boolean;
    anticipable: boolean;
  };
}

// Cliente HTTP para ASAAS
class AsaasClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = ASAAS_BASE_URL;
    this.apiKey = ASAAS_API_KEY;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        access_token: this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ASAAS API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Gerenciar clientes
  async createCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>(`/customers/${customerId}`);
  }

  async updateCustomer(customerId: string, customerData: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>(`/customers/${customerId}`, {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  // Gerenciar cobranças
  async createCharge(chargeData: AsaasCharge): Promise<AsaasCharge> {
    return this.request<AsaasCharge>("/payments", {
      method: "POST",
      body: JSON.stringify(chargeData),
    });
  }

  async getCharge(chargeId: string): Promise<AsaasCharge> {
    return this.request<AsaasCharge>(`/payments/${chargeId}`);
  }

  async createPixCharge(chargeData: Omit<AsaasCharge, "billingType">): Promise<AsaasCharge & { qrCode?: any }> {
    const pixCharge = {
      ...chargeData,
      billingType: "PIX" as const,
    };

    const response = await this.request<AsaasCharge & { qrCode?: any }>("/payments", {
      method: "POST",
      body: JSON.stringify(pixCharge),
    });

    // Buscar QR Code se for PIX
    if (response.id) {
      try {
        const qrCode = await this.request<any>(`/payments/${response.id}/pixQrCode`);
        response.qrCode = qrCode;
      } catch (error) {
        console.warn("Erro ao buscar QR Code PIX:", error);
      }
    }

    return response;
  }

  async createCreditCardCharge(
    chargeData: Omit<AsaasCharge, "billingType">,
    creditCardData: AsaasCreditCardData,
    creditCardHolderInfo?: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      addressComplement?: string;
      phone?: string;
      mobilePhone?: string;
    }
  ): Promise<AsaasCharge> {
    const creditCardCharge = {
      ...chargeData,
      billingType: "CREDIT_CARD" as const,
      creditCard: creditCardData,
      creditCardHolderInfo,
    };

    return this.request<AsaasCharge>("/payments", {
      method: "POST",
      body: JSON.stringify(creditCardCharge),
    });
  }

  // Webhook validation
  validateWebhook(payload: string, signature: string): boolean {
    const hash = crypto.createHmac("sha256", ASAAS_WEBHOOK_TOKEN).update(payload).digest("hex");

    return hash === signature;
  }

  // Utilities
  formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}

// Instância única do cliente
export const asaasClient = new AsaasClient();

// Funções de conveniência
export const createAsaasCustomer = (customerData: AsaasCustomer) => asaasClient.createCustomer(customerData);

export const createPixPayment = (
  customerId: string,
  value: number,
  dueDate: Date,
  description: string,
  externalReference?: string
) =>
  asaasClient.createPixCharge({
    customer: customerId,
    value,
    dueDate: asaasClient.formatDate(dueDate),
    description,
    externalReference,
  });

export const createBoletoPayment = (
  customerId: string,
  value: number,
  dueDate: Date,
  description: string,
  externalReference?: string
) =>
  asaasClient.createCharge({
    customer: customerId,
    billingType: "BOLETO",
    value,
    dueDate: asaasClient.formatDate(dueDate),
    description,
    externalReference,
  });

export const createCreditCardPayment = (
  customerId: string,
  value: number,
  description: string,
  creditCardData: AsaasCreditCardData,
  creditCardHolderInfo: any,
  installments: number = 1,
  externalReference?: string
) =>
  asaasClient.createCreditCardCharge(
    {
      customer: customerId,
      value,
      dueDate: asaasClient.formatDate(new Date()),
      description,
      installmentCount: installments,
      installmentValue: installments > 1 ? value / installments : undefined,
      externalReference,
    },
    creditCardData,
    creditCardHolderInfo
  );

export const validateAsaasWebhook = (payload: string, signature: string) =>
  asaasClient.validateWebhook(payload, signature);

export default asaasClient;
