import { QiAgentWallet, Zone } from './src';
import * as fs from 'fs';

async function main() {
  const creds = JSON.parse(fs.readFileSync('../qi-wallet-credentials.json', 'utf-8'));
  
  console.log('Loading wallet...');
  const wallet = await QiAgentWallet.fromMnemonic(creds.mnemonic, {
    network: 'mainnet',
    defaultZone: Zone.Cyprus1,
  });
  
  console.log('Syncing...');
  await wallet.sync();
  
  console.log('Checking balance...');
  const balance = await wallet.getBalance(Zone.Cyprus1);
  console.log(`\nCyprus1 Balance: ${balance.balance} Qi`);
  console.log(`UTXO Count: ${balance.utxoCount}`);
  
  const total = await wallet.getTotalBalance();
  console.log(`\nTotal Balance: ${total} Qi`);
}

main().catch(console.error);
