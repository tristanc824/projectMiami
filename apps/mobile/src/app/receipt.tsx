import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { Text } from '../components/Text';
import { Button, DemoNote, Detail, Icon, Notice, Pill, Screen } from '../components/ui';
import { money, type Activity } from '../domain/wallet';
import { explorerUrl } from '../services/dat';
import { useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function ReceiptScreen() {
  const { colors, styles: t } = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { wallet, ready } = useWallet();
  const item = wallet.activity.find(activity => activity.id === id);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  if (!ready) return <Screen back title="Loading your receipt…" />;
  if (!item) return <Screen back title="Receipt unavailable"><Notice>That demo receipt could not be found on this device.</Notice><Button style={{ marginTop: 20 }} title="Back home" onPress={() => router.dismissTo('/')} /></Screen>;
  if (item.live) return <LiveReceipt item={item} />;
  const share = async () => {
    try { await Share.share({ message: `Guard DEMO receipt\n${item.name}: ${money(item.amountCents)} USDC\nReference: ${item.id}\nNo real funds moved. No Solana transaction or bank payout occurred.` }); } catch { setError('Could not open sharing on this device.'); }
  };
  return <Screen back>
    <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 28, gap: 13 }}><View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="checkmark" size={43} color={colors.green} /></View><Pill>DEMO RECEIPT</Pill><Text style={[t.title, { fontSize: 29, textAlign: 'center' }]}>{item.kind === 'send' ? 'A little love, recorded.' : item.kind === 'add' ? 'Demo balance topped up.' : item.kind === 'withdraw' ? 'Withdrawal preview recorded.' : 'A little something received.'}</Text><Text style={{ fontSize: 47, color: colors.green, fontWeight: '600', letterSpacing: -1.7 }}>{money(item.amountCents)}</Text><Text style={t.muted}>{item.kind === 'send' ? `To ${item.name}` : item.name}</Text></View>
    <View style={t.card}><Detail label="Amount" value={`${money(item.amountCents)} demo USDC`} /><Detail label="Demo fee" value={money(item.feeCents)} /><Detail label="Date" value={new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} /><Detail label="Note" value={item.note} /><View style={t.divider} /><Detail label="Local demo ledger" value="Recorded" /><Detail label="Solana transaction" value="Not sent" /><Detail label="Fiat provider" value="Not connected" /><Detail label="Bank payout" value="Not initiated" /></View>
    <View style={{ marginTop: 17 }}><Notice>This receipt is a prototype record, not proof of payment. No real money moved.</Notice></View>
    <Button style={{ marginTop: 22 }} title="Back to home" onPress={() => router.dismissTo('/')} />
    <View style={[t.row, { gap: 10, marginTop: 10 }]}><Button style={{ flex: 1 }} title={copied ? 'Copied' : 'Copy reference'} variant="secondary" icon="copy-outline" onPress={() => { void Clipboard.setStringAsync(item.id).then(() => setCopied(true)).catch(() => setError('Clipboard access is unavailable.')); }} /><Button style={{ flex: 1 }} title="Share demo receipt" variant="secondary" onPress={() => { void share(); }} /></View>
    {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}<DemoNote />
  </Screen>;
}

/** A real devnet transaction, with a link judges can open on Solana Explorer. */
function LiveReceipt({ item }: { item: Activity }) {
  const { colors, styles: t } = useColors();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const signature = item.signature ?? '';
  const short = signature ? `${signature.slice(0, 6)}…${signature.slice(-6)}` : 'Not available';
  const headline = item.kind === 'send' ? 'Sent.' : item.kind === 'add' ? 'Money added.' : item.kind === 'withdraw' ? 'Cashed out.' : 'Money received.';
  return <Screen back>
    <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 28, gap: 13 }}><View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="checkmark" size={43} color={colors.green} /></View><Pill>SOLANA DEVNET</Pill><Text style={[t.title, { fontSize: 29, textAlign: 'center' }]}>{headline}</Text><Text style={{ fontSize: 47, color: colors.green, fontWeight: '600', letterSpacing: -1.7 }}>{money(item.amountCents)}</Text><Text style={t.muted}>{item.kind === 'send' ? `To ${item.name}` : item.name}</Text></View>
    <View style={t.card}><Detail label="Amount" value={`${money(item.amountCents)} test USDC`} /><Detail label="Network fee" value="Paid by Guard" /><Detail label="Date" value={new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} /><Detail label="Note" value={item.note} /><View style={t.divider} /><Detail label="Solana transaction" value={short} />{item.kind === 'add' ? <Detail label="Card payment" value="Stripe test mode" /> : null}{item.kind === 'withdraw' ? <Detail label="Bank payout" value="Simulated" /> : null}</View>
    <View style={{ marginTop: 17 }}><Notice>{item.kind === 'withdraw' ? 'The USDC transfer is real on Solana devnet. The bank payout is simulated.' : 'A real transaction on Solana devnet, using test USDC with no real-world value.'}</Notice></View>
    {signature ? <Button style={{ marginTop: 22 }} title="View on Solana Explorer" icon="open-outline" onPress={() => { void Linking.openURL(explorerUrl(signature)).catch(() => setError('Could not open the browser.')); }} /> : null}
    <View style={[t.row, { gap: 10, marginTop: 10 }]}><Button style={{ flex: 1 }} title="Back to home" variant="secondary" onPress={() => router.dismissTo('/')} />{signature ? <Button style={{ flex: 1 }} title={copied ? 'Copied' : 'Copy signature'} variant="secondary" icon="copy-outline" onPress={() => { void Clipboard.setStringAsync(signature).then(() => setCopied(true)).catch(() => setError('Clipboard access is unavailable.')); }} /> : null}</View>
    {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}<DemoNote />
  </Screen>;
}
