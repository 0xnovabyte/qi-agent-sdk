import { QiHDWallet, Mnemonic, JsonRpcProvider, Zone, Contract, HDNodeWallet } from 'quais';
import { readFileSync } from 'fs';

const MAILBOX_ADDRESS = '0x004C82298b3ED69a949008d7037918B13A4260c5';
const MAILBOX_ABI = [
  'function getNotifications(string receiverPaymentCode) view returns (string[])'
];

// Simulate the SDK's sync flow
async function testSDKSync() {
  console.log('=== Testing SDK Sync Flow (quais 1.0.0-alpha.53) ===\n');
  
  const creds = JSON.parse(readFileSync('../qi-wallet-credentials.json', 'utf-8'));
  const provider = new JsonRpcProvider('https://rpc.quai.network');
  
  // Create wallet
  const mnemonic = Mnemonic.fromPhrase(creds.mnemonic);
  const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
  qiWallet.connect(provider);
  
  // Step 1: Discover senders from mailbox
  console.log('Step 1: Checking mailbox for senders...');
  const mailbox = new Contract(MAILBOX_ADDRESS, MAILBOX_ABI, provider);
  const senders = await mailbox.getNotifications(creds.paymentCode);
  console.log(`Found ${senders.length} sender(s)`);
  
  // Step 2: Open payment channels
  console.log('\nStep 2: Opening payment channels...');
  for (const senderPC of senders) {
    try {
      await qiWallet.openChannel(senderPC);
      console.log(`  ✓ Channel opened with ${senderPC.slice(0, 30)}...`);
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`);
    }
  }
  
  // Step 3: Scan for UTXOs
  console.log('\nStep 3: Scanning Cyprus1 for UTXOs...');
  const start = Date.now();
  await qiWallet.scan(Zone.Cyprus1);
  console.log(`Scan completed in ${Date.now() - start}ms`);
  
  // Step 4: Check balance
  const outpoints = qiWallet.getOutpoints(Zone.Cyprus1);
  console.log(`\nStep 4: Found ${outpoints.length} UTXO(s)`);
  
  let total = 0n;
  for (const op of outpoints) {
    const denom = BigInt(op.outpoint.denomination);
    total += denom;
    console.log(`  - ${op.outpoint.txhash.slice(0, 24)}... : ${denom} Qi`);
  }
  
  console.log(`\n=== Total Balance: ${total} Qi ===`);
}

testSDKSync().catch(console.error);
