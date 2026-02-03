/**
 * Qi Agent SDK
 * 
 * High-level SDK for AI agents to send and receive Qi on the Quai network.
 * 
 * @example
 * ```typescript
 * import { QiAgentWallet } from '@quai/agent-sdk';
 * 
 * // Create a new wallet
 * const { wallet, mnemonic } = await QiAgentWallet.create();
 * console.log('Payment code:', wallet.getPaymentCode());
 * console.log('Mnemonic (save securely!):', mnemonic);
 * 
 * // Or import from existing mnemonic
 * const wallet = await QiAgentWallet.fromMnemonic('your mnemonic phrase...');
 * 
 * // Check balance
 * const balance = await wallet.getBalance();
 * console.log('Balance:', balance.balance, 'Qi');
 * 
 * // Send payment
 * const payment = await wallet.send(
 *   'PM8T...recipient_payment_code',
 *   1000000n,  // amount in Qi
 * );
 * 
 * // Listen for incoming payments
 * wallet.onPaymentReceived((payment) => {
 *   console.log(`Received ${payment.amount} Qi from ${payment.senderPaymentCode}`);
 * });
 * 
 * // Start polling for payments
 * wallet.startPolling();
 * ```
 * 
 * @packageDocumentation
 */

export { QiAgentWallet } from './wallet';
export { MailboxClient, MAILBOX_ABI, MAILBOX_INTERFACE, MAILBOX_EVENTS } from './mailbox';
export {
  QiAgentConfig,
  SerializedWallet,
  PaymentReceived,
  PaymentSent,
  ZoneBalance,
  PaymentReceivedCallback,
  SenderDiscoveredCallback,
  NETWORK_CONFIGS,
} from './types';

// Re-export useful quais types
export { Zone, Mnemonic } from 'quais';
