import { QiHDWallet, Mnemonic, JsonRpcProvider, Zone } from 'quais';
import * as fs from 'fs';

async function main() {
  const creds = JSON.parse(fs.readFileSync('../qi-wallet-credentials.json', 'utf-8'));
  
  console.log('Creating wallet from mnemonic...');
  const mnemonic = Mnemonic.fromPhrase(creds.mnemonic);
  const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
  
  // Use zone-specific RPC
  console.log('Connecting to Cyprus1 RPC...');
  const provider = new JsonRpcProvider('https://rpc.quai.network/cyprus1');
  qiWallet.connect(provider);
  
  // Generate address
  console.log('Generating address...');
  const addrInfo = await qiWallet.getNextAddress(0, Zone.Cyprus1);
  console.log('Address info:', addrInfo);
  
  // Get payment code
  const paymentCode = qiWallet.getPaymentCode(0);
  console.log('\nPayment Code:', paymentCode);
  
  // Scan for UTXOs
  console.log('\nScanning for UTXOs...');
  await qiWallet.scan(Zone.Cyprus1);
  
  // Check outpoints
  const outpoints = qiWallet.getOutpoints(Zone.Cyprus1);
  console.log('\nOutpoints found:', outpoints.length);
  
  let balance = 0n;
  for (const op of outpoints) {
    console.log('  -', op.outpoint.denomination, 'Qi');
    balance += BigInt(op.outpoint.denomination);
  }
  console.log('\nTotal balance:', balance.toString(), 'Qi');
}

main().catch(console.error);
