'use client';

import { Elements, ExpressCheckoutElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import type { Session } from './types';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function ExpressPay({ amount, session, onDone, onError }: { amount: number; session: Session; onDone: (sig: string) => void; onError: (m: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <ExpressCheckoutElement
      options={{ paymentMethods: { applePay: 'always', googlePay: 'auto' } }}
      onReady={({ availablePaymentMethods }) => setVisible(Boolean(availablePaymentMethods))}
      onConfirm={async () => {
        if (!stripe || !elements) return;
        try {
          const submitted = await elements.submit();
          if (submitted.error) throw new Error(submitted.error.message);
          const { id, clientSecret } = await session.depositIntent(amount);
          const { error } = await stripe.confirmPayment({
            elements,
            clientSecret,
            redirect: 'if_required',
            confirmParams: { return_url: window.location.href },
          });
          if (error) throw new Error(error.message);
          onDone(await session.depositComplete(id, amount));
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Payment failed');
        }
      }}
    />
  );
}

type Props = {
  amount: number;
  applePay: boolean;
  session: Session;
  onDone: (signature: string) => void;
  onError: (message: string) => void;
};

export default function AddMoney({ amount, applePay, session, onDone, onError }: Props) {
  if (!applePay || !stripePromise) return null;
  return (
    <Elements key={amount} stripe={stripePromise} options={{ mode: 'payment', amount: amount * 100, currency: 'usd' }}>
      <ExpressPay amount={amount} session={session} onDone={onDone} onError={onError} />
    </Elements>
  );
}
