import { Contract, Interface, JsonRpcProvider } from 'quais';
import * as fs from 'fs';

const MAILBOX_ABI = [
  'function getNotifications(string receiverPaymentCode) view returns (string[])'
];

async function main() {
  const myPaymentCode = 'PM8TJivRWKbMFyHxTbfeoRtUiNxZYqLTYf8kGcHD1Ui1eXzkzh7bjtCRnTqPGDdaoD3iaqPvN9nD3Lsap8jfQp8dXXk1BTb1Bgt2SD3j1hzVxyN4aFnD';
  const mailboxAddress = '0x004C82298b3ED69a949008d7037918B13A4260c5';
  
  // Use zone-specific RPC
  const provider = new JsonRpcProvider('https://rpc.quai.network/cyprus1');
  
  console.log('Checking mailbox for notifications...');
  console.log('My payment code:', myPaymentCode.substring(0, 20) + '...');
  console.log('Mailbox address:', mailboxAddress);
  
  const contract = new Contract(mailboxAddress, MAILBOX_ABI, provider);
  
  try {
    const notifications = await contract.getNotifications(myPaymentCode);
    console.log('\nNotifications received:', notifications.length);
    for (const sender of notifications) {
      console.log('  Sender:', sender.substring(0, 30) + '...');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
