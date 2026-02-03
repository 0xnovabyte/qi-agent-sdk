import { QiHDWallet, Mnemonic, JsonRpcProvider, Zone } from 'quais';
import * as fs from 'fs';

async function main() {
  const creds = JSON.parse(fs.readFileSync('../qi-wallet-credentials.json', 'utf-8'));
  const senderPaymentCode = 'PM8TJKAMm5GLHKuu137qbeGu4a7y1FGZsYRW3SsJSwJzgEqsR7VjFDe99b1Azx1qCmxdW9y9CndetuAcp9TCf5Luhiju5xAmYj1oFmi8oSVPUXtyF3z2';
  
  console.log('Loading wallet...');
  const mnemonic = Mnemonic.fromPhrase(creds.mnemonic);
  const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
  
  const provider = new JsonRpcProvider('https://rpc.quai.network/cyprus1');
  qiWallet.connect(provider);
  
  // Generate my addresses first
  console.log('Generating addresses...');
  await qiWallet.getNextAddress(0, Zone.Cyprus1);
  
  console.log('My payment code:', qiWallet.getPaymentCode(0));
  console.log('Sender payment code:', senderPaymentCode.substring(0, 30) + '...');
  
  // Open a channel with the sender (this derives the shared addresses)
  console.log('\nOpening payment channel with sender...');
  try {
    // Import the sender's payment code to derive addresses
    await qiWallet.openChannel(senderPaymentCode);
    console.log('Channel opened');
  } catch (e) {
    console.log('openChannel error:', e.message);
  }
  
  // Now scan for UTXOs
  console.log('\nScanning for UTXOs...');
  await qiWallet.scan(Zone.Cyprus1);
  
  // Check balance
  const outpoints = qiWallet.getOutpoints(Zone.Cyprus1);
  console.log('\nOutpoints found:', outpoints.length);
  
  let total = 0n;
  for (const op of outpoints) {
    const denom = BigInt(op.outpoint.denomination);
    console.log('  UTXO:', denom.toString(), 'Qi at', op.outpoint.txhash?.substring(0, 20) + '...');
    total += denom;
  }
  console.log('\nTotal balance:', total.toString(), 'Qi');
}

main().catch(e => console.error('Error:', e.message));
