export type Recipient = { phone: string; address: string; invited: boolean };

export type ActivityKind = 'deposit' | 'sent' | 'received' | 'cashout' | 'card';

export type Activity = {
  id: string;
  kind: ActivityKind;
  label: string;
  amount: number;
  at: number;
  signature?: string;
};

export type Session = {
  phone: string;
  address: string;
  balance: number | null;
  activity: Activity[];
  received: { amount: number; at: number } | null;
  knownRecipient: (phone: string) => boolean;
  findRecipient: (phone: string) => Promise<Recipient>;
  send: (recipient: Recipient, amount: number) => Promise<string>;
  toTreasury: (kind: 'cashout' | 'card', label: string, amount: number) => Promise<string>;
  depositTestCard: (amount: number) => Promise<string>;
  depositIntent: (amount: number) => Promise<{ id: string; clientSecret: string }>;
  depositComplete: (id: string, amount: number) => Promise<string>;
  logout: () => Promise<void>;
};

export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
export const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`;
