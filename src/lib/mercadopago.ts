import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { logger } from "@/lib/logger";


// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
    idempotencyKey: "abc",
  },
});

export const payment = new Payment(client);
export const preference = new Preference(client);

export interface PaymentData {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
  notification_url?: string;
  metadata?: Record<string, any>;
}

export interface PreferenceData {
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
    address?: {
      street_name?: string;
      street_number?: string;
      zip_code?: string;
    };
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: "approved" | "all";
  payment_methods?: {
    excluded_payment_methods?: Array<{ id: string }>;
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number;
  };
  notification_url?: string;
  external_reference?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
}

export const createPayment = async (paymentData: PaymentData) => {
  try {
    const response = await payment.create({
      body: paymentData,
    });
    return response;
  } catch (error) {
    logger.error("Erro ao criar pagamento:", error);
    throw error;
  }
};

export const createPreference = async (preferenceData: PreferenceData) => {
  try {
    const response = await preference.create({
      body: preferenceData,
    });
    return response;
  } catch (error) {
    logger.error("Erro ao criar preferência:", error);
    throw error;
  }
};

export const getPayment = async (paymentId: string) => {
  try {
    const response = await payment.get({ id: paymentId });
    return response;
  } catch (error) {
    logger.error("Erro ao buscar pagamento:", error);
    throw error;
  }
};

export const createPixPayment = async ({
  amount,
  description,
  payerEmail,
  externalReference,
}: {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference?: string;
}) => {
  const paymentData: PaymentData = {
    transaction_amount: amount,
    description,
    payment_method_id: "pix",
    payer: {
      email: payerEmail,
    },
    external_reference: externalReference,
    notification_url: `${process.env.NEXTAUTH_URL}/api/payments/webhook`,
  };

  return createPayment(paymentData);
};

export default client;
