import { QiHDWallet, Mnemonic, JsonRpcProvider, Zone, Contract } from 'quais';
import { readFileSync } from 'fs';

const MAILBOX_ADDRESS = '0x004C82298b3ED69a949008d7037918B13A4260c5';
const MAILBOX_ABI = [
  'function getNotifications(string receiverPaymentCode) view returns (string[])'
];

async function testFullScan() {
  console.log('=== Full Qi Wallet Scan Test (quais 1.0.0-alpha.53) ===\n');
  
  // Load credentials
  const creds = JSON.parse(readFileSync('../qi-wallet-credentials.json', 'utf-8'));
  console.log('Payment Code:', creds.paymentCode.slice(0, 40) + '...');
  
  // Create provider
  const provider = new JsonRpcProvider('https://rpc.quai.network');
  
  // Check mailbox first
  console.log('\n--- Checking Mailbox for Sender Notifications ---');
  try {
    const mailbox = new Contract(MAILBOX_ADDRESS, MAILBOX_ABI, provider);
    const notifications = await mailbox.getNotifications(creds.paymentCode);
    console.log(`Found ${notifications.length} sender notification(s)`);
    if (notifications.length > 0) {
      notifications.forEach((pc, i) => {
        console.log(`  ${i + 1}: ${pc.slice(0, 40)}...`);
      });
    }
  } catch (err) {
    console.log('Mailbox check error:', err.message);
  }
  
  // Create wallet from mnemonic
  const mnemonic = Mnemonic.fromPhrase(creds.mnemonic);
  const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
  qiWallet.connect(provider);
  
  // Scan all zones
  console.log('\n--- Scanning All Zones ---');
  const zones = [
    Zone.Cyprus1, Zone.Cyprus2, Zone.Cyprus3,
    Zone.Paxos1, Zone.Paxos2, Zone.Paxos3,
    Zone.Hydra1, Zone.Hydra2, Zone.Hydra3
  ];
  
  let totalOutpoints = 0;
  let totalBalance = 0n;
  
  for (const zone of zones) {
    const zoneName = Object.entries(Zone).find(([k, v]) => v === zone)?.[0] || zone;
    process.stdout.write(`Scanning ${zoneName}... `);
    
    try {
      const start = Date.now();
      await qiWallet.scan(zone);
      const elapsed = Date.now() - start;
      
      const outpoints = qiWallet.getOutpoints(zone);
      const addresses = qiWallet.getAddressesForZone(zone);
      
      if (outpoints.length > 0) {
        let zoneBalance = 0n;
        for (const op of outpoints) {
          zoneBalance += BigInt(op.outpoint.denomination);
        }
        console.log(`${outpoints.length} UTXOs, ${zoneBalance} Qi (${elapsed}ms)`);
        totalOutpoints += outpoints.length;
        totalBalance += zoneBalance;
      } else {
        console.log(`0 UTXOs, ${addresses.length} addresses (${elapsed}ms)`);
      }
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
  
  console.log('\n--- Summary ---');
  console.log(`Total UTXOs: ${totalOutpoints}`);
  console.log(`Total Balance: ${totalBalance} Qi`);
  
  // List first few external addresses
  console.log('\n--- External Receive Addresses (Cyprus1) ---');
  const extAddresses = qiWallet.getAddressesForZone(Zone.Cyprus1);
  extAddresses.slice(0, 3).forEach((addr, i) => {
    console.log(`  ${i}: ${addr.address}`);
  });
}

testFullScan().catch(console.error);
