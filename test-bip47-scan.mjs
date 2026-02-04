import { QiHDWallet, Mnemonic, JsonRpcProvider, Zone, Contract } from 'quais';
import { readFileSync } from 'fs';

const MAILBOX_ADDRESS = '0x004C82298b3ED69a949008d7037918B13A4260c5';
const MAILBOX_ABI = [
  'function getNotifications(string receiverPaymentCode) view returns (string[])'
];

async function testBIP47Scan() {
  console.log('=== BIP47 Payment Channel Scan Test ===\n');
  
  // Load credentials
  const creds = JSON.parse(readFileSync('../qi-wallet-credentials.json', 'utf-8'));
  console.log('My Payment Code:', creds.paymentCode.slice(0, 50) + '...');
  
  // Create provider
  const provider = new JsonRpcProvider('https://rpc.quai.network');
  
  // Get sender payment codes from mailbox
  const mailbox = new Contract(MAILBOX_ADDRESS, MAILBOX_ABI, provider);
  const senderCodes = await mailbox.getNotifications(creds.paymentCode);
  console.log(`\nFound ${senderCodes.length} sender(s) in mailbox:`);
  senderCodes.forEach((pc, i) => console.log(`  ${i + 1}: ${pc}`));
  
  // Create wallet
  const mnemonic = Mnemonic.fromPhrase(creds.mnemonic);
  const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
  qiWallet.connect(provider);
  
  // Try to open payment channels with each sender
  console.log('\n--- Opening Payment Channels ---');
  for (const senderPC of senderCodes) {
    console.log(`\nOpening channel with ${senderPC.slice(0, 40)}...`);
    try {
      // This should derive the BIP47 addresses for this specific sender
      await qiWallet.openChannel(senderPC);
      console.log('Channel opened');
    } catch (err) {
      console.log('openChannel error:', err.message);
      
      // Try alternative method - maybe it's called something else in alpha.53
      try {
        // Check if there's a method to add a sender/counterparty
        console.log('Trying alternative methods...');
        
        // List available methods on qiWallet
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(qiWallet))
          .filter(m => !m.startsWith('_') && typeof qiWallet[m] === 'function');
        console.log('Available wallet methods:', methods.slice(0, 20).join(', '));
      } catch (e) {
        console.log('Alt method error:', e.message);
      }
    }
  }
  
  // Now scan again
  console.log('\n--- Rescanning Cyprus1 After Channel Open ---');
  await qiWallet.scan(Zone.Cyprus1);
  
  const outpoints = qiWallet.getOutpoints(Zone.Cyprus1);
  console.log(`Found ${outpoints.length} outpoints`);
  
  if (outpoints.length > 0) {
    let total = 0n;
    for (const op of outpoints) {
      total += BigInt(op.outpoint.denomination);
      console.log(`  - ${op.outpoint.txhash.slice(0, 20)}... : ${op.outpoint.denomination}`);
    }
    console.log(`Total: ${total} Qi`);
  }
  
  // Check all addresses now
  const addresses = qiWallet.getAddressesForZone(Zone.Cyprus1);
  console.log(`\nTotal addresses for Cyprus1: ${addresses.length}`);
}

testBIP47Scan().catch(console.error);
