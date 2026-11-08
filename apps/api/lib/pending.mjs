export class PendingTransaction extends Error {
  constructor(signature, lastValidBlockHeight) {
    super('This payment is awaiting confirmation. Check Activity or Solana Explorer before sending again.');
    this.code = 'TRANSACTION_PENDING';
    this.signature = signature;
    this.lastValidBlockHeight = lastValidBlockHeight;
  }
}
export function pendingResponse(error) {
  return error?.code === 'TRANSACTION_PENDING' && typeof error.signature === 'string'
    ? { status: 'pending', signature: error.signature, lastValidBlockHeight: error.lastValidBlockHeight, message: error.message }
    : null;
}
