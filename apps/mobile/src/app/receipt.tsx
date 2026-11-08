import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { AppleCashDemoAnimation } from '../components/AppleCashDemoAnimation';
import { ContactNameButton } from '../components/ContactNameButton';
import { useContacts } from '../state/ContactsProvider';
import { Text } from '../components/Text';
import { Birds } from '../components/NestArtwork';
import { Avatar, Button, DemoNote, Detail, Icon, Notice, Pill, Screen, Sheet } from '../components/ui';
import { contacts, money } from '../domain/wallet';
import { explorerUrl } from '../services/dat';
import { useDemoWallet, useWallet } from '../state/WalletProvider';
import { useColors } from '../theme';

export default function ReceiptScreen() {
  const { colors, styles: t } = useColors();
  const router = useRouter();
  const { id, demo, animation } = useLocalSearchParams<{ id?: string; demo?: string; animation?: string }>();
  const [showAnimation, setShowAnimation] = useState(animation === 'apple-cash');
  const { nameFor } = useContacts();
  const normalWallet = useWallet();
  const demoWallet = useDemoWallet();
  const { wallet, ready } = demo === '1' ? demoWallet : normalWallet;
  const item = wallet.activity.find(activity => activity.id === id);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [support, setSupport] = useState(false);
  if (!ready) return <Screen back title="Loading your receipt…" />;
  if (!item) return <Screen back title="Receipt unavailable"><Notice>That receipt could not be found on this device.</Notice><Button style={{ marginTop: 20 }} title="Back home" onPress={() => router.dismissTo('/')} /></Screen>;
  const contact = contacts.find(c => c.id === item.contactId);
  const live = !!item.live;
  const recipientName = nameFor(item.recipientPhone, contact?.name ?? item.name);
  const payoutName = item.withdrawalDestination === 'apple-cash' ? 'Apple Cash' : 'Bank account';
  const headline = item.kind === 'send' ? live ? 'On its way.' : 'A little closer.' : item.kind === 'add' ? 'Money added.' : item.kind === 'withdraw' ? item.withdrawalDestination === 'apple-cash' ? 'Demo withdrawal complete.' : 'Ready for what’s next.' : 'A little something for you.';
  const share = async () => {
    try { await Share.share({ message: `Nest ${live ? 'devnet' : 'DEMO'} receipt\n${recipientName}: ${money(item.amountCents)}\nReference: ${item.id}\n${live ? `Test USDC on Solana devnet. ${item.signature ? explorerUrl(item.signature) : ''}` : 'No real funds moved. No Solana transaction or bank payout occurred.'}` }); }
    catch { setError('Could not open sharing on this device.'); }
  };
  return <Screen back footer={<Button title="Back to home" onPress={() => router.dismissTo('/')} />}>
    {showAnimation && item.kind === 'withdraw' && item.withdrawalDestination === 'apple-cash' ? <AppleCashDemoAnimation amountCents={item.amountCents} onDone={() => { setShowAnimation(false); router.setParams({ animation: 'played' }); }} /> : null}
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 28 }}>
      <Birds />
      <View style={{ marginTop: 8, marginBottom: 28 }}>
        {contact ? <Avatar contact={contact} size={96} /> : <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.kind === 'add' ? 'add' : item.kind === 'withdraw' ? item.withdrawalDestination === 'apple-cash' ? 'logo-apple' : 'business-outline' : item.kind === 'receive' ? 'arrow-down' : 'paper-plane-outline'} size={38} color={colors.green} /></View>}
        <View style={{ position: 'absolute', bottom: -4, right: -4, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.background }}><Icon name="checkmark" size={18} color={colors.background} /></View>
      </View>
      <Text accessibilityRole="header" style={[t.title, { fontSize: 34, lineHeight: 37, textAlign: 'center' }]}>{headline}</Text>
      <Text style={{ fontSize: 52, color: colors.ink, fontWeight: '600', letterSpacing: -2, marginTop: 14 }}>{money(item.amountCents)}</Text>
      <Text style={[t.muted, { marginTop: 8, marginBottom: 16 }]}>{item.kind === 'send' ? `To ${recipientName}` : item.name}</Text>
      <Pill>{live ? 'Solana devnet · Test dollars' : 'Demo receipt'}</Pill>
    </View>
    <View testID="receipt-details" style={t.card}>
      {item.kind === 'withdraw' ? <Detail label="Destination" value={payoutName} /> : null}
      <Detail label="Amount" value={`${money(item.amountCents)} ${live ? 'test dollars' : 'demo dollars'}`} />
      <Detail label={live ? 'Network fee' : 'Demo fee'} value={live ? 'Paid by Nest' : money(item.feeCents)} />
      <Detail label="When" value={new Date(item.createdAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })} />
      {item.note ? <Detail label="Note" value={item.note} /> : null}
      <View style={t.divider} />
      {live ? <><Detail label="Solana transaction" value={item.signature ? `${item.signature.slice(0, 6)}…${item.signature.slice(-6)}` : 'Not available'} />{item.kind === 'add' ? <Detail label="Card payment" value="Stripe test mode" /> : null}{item.kind === 'withdraw' ? <Detail label={item.withdrawalDestination === 'apple-cash' ? 'Apple Cash payout' : 'Bank payout'} value="Simulated" /> : null}</> : <><Detail label="Local demo ledger" value="Recorded" /><Detail label="Solana transaction" value="Not sent" /><Detail label="Fiat provider" value="Not connected" /><Detail label={item.kind === 'withdraw' && item.withdrawalDestination === 'apple-cash' ? 'Apple Cash payout' : 'Bank payout'} value="Not initiated" /></>}
    </View>
    <View style={{ marginTop: 18 }}><Notice>{live ? item.kind === 'withdraw' ? `Test dollars moved on devnet. The ${item.withdrawalDestination === 'apple-cash' ? 'Apple Cash' : 'bank'} payout is simulated.` : 'Test dollars on Solana devnet, with no real-world value.' : 'A demo record, not proof of payment. No real money moved.'}</Notice></View>
    {item.kind === 'send' && item.recipientPhone ? <View style={{ gap: 10, marginTop: 18 }}><Button title="Send again" icon="arrow-forward" variant="secondary" onPress={() => router.push({ pathname: '/send', params: { phone: item.recipientPhone } })} /><ContactNameButton phone={item.recipientPhone} /></View> : null}
    <Button style={{ marginTop: 10 }} title={live ? 'Share receipt' : 'Share demo receipt'} variant="secondary" icon="share-outline" onPress={() => { void share(); }} />
    {live && item.signature ? <Button style={{ marginTop: 10 }} title="View on Solana Explorer" variant="secondary" icon="open-outline" onPress={() => { void Linking.openURL(explorerUrl(item.signature!)).catch(() => setError('Could not open the browser.')); }} /> : null}
    <Button style={{ marginTop: 10 }} title={copied ? 'Copied' : 'Copy reference'} variant="secondary" onPress={() => { void Clipboard.setStringAsync(item.id).then(() => setCopied(true)).catch(() => setError('Clipboard access is unavailable.')); }} />
    <Button style={{ marginTop: 10 }} title="Something wrong?" variant="light" onPress={() => setSupport(true)} />
    {error ? <View style={{ marginTop: 12 }}><Notice error>{error}</Notice></View> : null}<DemoNote />
    <Sheet title="Something wrong?" visible={support} onClose={() => setSupport(false)}><Text style={[t.body, { marginBottom: 20 }]}>Keep your payment reference and contact the Nest demo team. Human support and disputes are not connected in this preview.</Text><Text selectable style={[t.muted, { marginBottom: 20 }]}>{item.id}</Text><Button title="Copy payment reference" onPress={() => { void Clipboard.setStringAsync(item.id).then(() => setCopied(true)).catch(() => setError('Clipboard access is unavailable.')); }} /></Sheet>
  </Screen>;
}
