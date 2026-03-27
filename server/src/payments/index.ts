export const initiatePayment = async (order: any) => {
  throw new Error('Payment gateway not configured')
}

export const verifyPayment = async (reference: string) => {
  throw new Error('Payment gateway not configured')
}

export const handleWebhook = async (req: any) => {
  throw new Error('Payment gateway not configured')
}
