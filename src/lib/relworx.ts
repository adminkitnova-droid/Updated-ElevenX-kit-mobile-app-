export interface RelworxPaymentRequest {
  phone: string;
  amount: number;
  currency: string;
  orderId: string;
  customerName: string;
}

export interface RelworxPaymentResponse {
  success: boolean;
  reference: string;
  provider: "MTN MoMo" | "Airtel Money";
  status: "COMPLETED" | "FAILED" | "PENDING";
  message: string;
}

export function detectUgandanProvider(phone: string): "MTN MoMo" | "Airtel Money" {
  const clean = phone.replace(/[^0-9]/g, "");
  // Standard Ugandan mobile prefixes:
  // MTN: 077, 078, 076
  // Airtel: 070, 075, 074
  if (clean.includes("77") || clean.includes("78") || clean.includes("76")) {
    return "MTN MoMo";
  }
  return "Airtel Money";
}

export async function processRelworxPayment(req: RelworxPaymentRequest): Promise<RelworxPaymentResponse> {
  const provider = detectUgandanProvider(req.phone);
  const ref = "RWX-" + Math.floor(10000000 + Math.random() * 90000000);

  // Simulate network roundtrip to Relworx API endpoint
  await new Promise((r) => setTimeout(r, 1800));

  return {
    success: true,
    reference: ref,
    provider,
    status: "COMPLETED",
    message: `Payment of UGX ${req.amount.toLocaleString()} approved via ${provider}. Transaction ref: ${ref}`,
  };
}
