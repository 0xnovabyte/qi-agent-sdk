import { QiHDWallet, Mnemonic, JsonRpcProvider, Zone } from 'quais';
import { readFileSync } from 'fs';

async function testScan() {
  console.log('Testing Qi wallet scan with quais 1.0.0-alpha.53...\n');
  
  // Load credentials
  const creds = JSON.parse(readFileSync('../qi-wallet-credentials.json', 'utf-8'));
  console.log('Payment Code:', creds.paymentCode);
  console.log('');
  
  // Create provider
  const provider = new JsonRpcProvider('https://rpc.quai.network');
  console.log('Connected to mainnet RPC');
  
  // Create wallet from mnemonic
  const mnemonic = Mnemonic.fromPhrase(creds.mnemonic);
  const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
  qiWallet.connect(provider);
  console.log('Wallet initialized');
  
  // Test scanning Cyprus1
  console.log('\nScanning Cyprus1 zone...');
  const startTime = Date.now();
  
  try {
    await qiWallet.scan(Zone.Cyprus1);
    const scanTime = Date.now() - startTime;
    console.log(`Scan completed in ${scanTime}ms`);
    
    // Check for outpoints
    const outpoints = qiWallet.getOutpoints(Zone.Cyprus1);
    console.log(`\nFound ${outpoints.length} outpoints in Cyprus1`);
    
    if (outpoints.length > 0) {
      let totalBalance = 0n;
      for (const op of outpoints) {
        const denom = BigInt(op.outpoint.denomination);
        totalBalance += denom;
        console.log(`  - ${op.outpoint.txhash.slice(0, 16)}... : ${denom} Qi`);
      }
      console.log(`\nTotal balance: ${totalBalance} Qi`);
    } else {
      console.log('No UTXOs found - wallet may be empty or addresses not yet used');
    }
    
    // Also check addresses generated
    const addresses = qiWallet.getAddressesForZone(Zone.Cyprus1);
    console.log(`\nAddresses in wallet for Cyprus1: ${addresses.length}`);
    if (addresses.length > 0) {
      addresses.slice(0, 5).forEach((addr, i) => {
        console.log(`  ${i}: ${addr.address}`);
      });
      if (addresses.length > 5) {
        console.log(`  ... and ${addresses.length - 5} more`);
      }
    }
    
  } catch (error) {
    console.error('Scan error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testScan().catch(console.error);
