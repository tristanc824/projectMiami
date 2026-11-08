type Approval = (label: string) => Promise<void>;
let approve: Approval | null = null;
export function registerApproval(handler: Approval) {
  approve = handler;
  return () => { if (approve === handler) approve = null; };
}
export function approvePayment(label: string) {
  if (!approve) return Promise.reject(new Error('Unlock Nest before approving a payment.'));
  return approve(label);
}
