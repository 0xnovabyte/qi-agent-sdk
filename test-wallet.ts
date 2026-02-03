/**
 * Test script to create a wallet and display payment code
 */
import { QiAgentWallet, Zone } from './src';

async function main() {
  console.log('Creating new Qi Agent wallet...\n');
  
  try {
    // Create a new wallet
    const { wallet, mnemonic } = await QiAgentWallet.create({
      network: 'mainnet',
      defaultZone: Zone.Cyprus1,
    });
    
    console.log('✅ Wallet created successfully!\n');
    console.log('='.repeat(60));
    console.log('IMPORTANT: Save this mnemonic securely!');
    console.log('='.repeat(60));
    console.log(`\nMnemonic: ${mnemonic}\n`);
    console.log('='.repeat(60));
    console.log('Share this payment code to receive Qi:');
    console.log('='.repeat(60));
    console.log(`\nPayment Code: ${wallet.getPaymentCode()}\n`);
    
    // Serialize for persistence
    const serialized = wallet.serialize();
    console.log('Serialized wallet state (for persistence):');
    console.log(JSON.stringify(serialized, null, 2));
    
  } catch (error) {
    console.error('Error creating wallet:', error);
  }
}

main();
