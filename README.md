# Qi Agent SDK

High-level SDK for AI agents to send and receive Qi on the Quai network.

## Features

- 🔐 **BIP47 Payment Codes** - Private, reusable payment addresses
- 📬 **Mailbox Integration** - Automatic sender notification for cold contacts
- ⚡ **Simple API** - Create wallet, send, receive in minutes
- 🔄 **Auto-sync** - Polling for new payments and notifications
- 💾 **Serializable** - Save and restore wallet state

## Installation

```bash
npm install @quai/agent-sdk
```

## Quick Start

### Create a New Wallet

```typescript
import { QiAgentWallet } from '@quai/agent-sdk';

// Create a new wallet (generates mnemonic)
const { wallet, mnemonic } = await QiAgentWallet.create();

// IMPORTANT: Save the mnemonic securely!
console.log('Mnemonic:', mnemonic);

// Get your payment code (share this to receive payments)
console.log('Payment code:', wallet.getPaymentCode());
```

### Import Existing Wallet

```typescript
const wallet = await QiAgentWallet.fromMnemonic(
  'your twelve word mnemonic phrase goes here'
);
```

### Check Balance

```typescript
import { Zone } from '@quai/agent-sdk';

// Get balance for default zone (Cyprus1)
const balance = await wallet.getBalance();
console.log(`Balance: ${balance.balance} Qi (${balance.utxoCount} UTXOs)`);

// Get balance for specific zone
const paxosBalance = await wallet.getBalance(Zone.Paxos1);

// Get total balance across all zones
const total = await wallet.getTotalBalance();
```

### Send Payment

```typescript
// Send Qi to another agent/user
const payment = await wallet.send(
  'PM8T...recipientPaymentCode',  // recipient's payment code
  1000000n,                        // amount in Qi
  Zone.Cyprus1,                    // origin zone
  Zone.Cyprus1                     // destination zone (optional)
);

console.log('Qi TX:', payment.qiTxHash);
console.log('Notification TX:', payment.notifyTxHash);
```

The SDK automatically:
1. Sends a mailbox notification (if first time paying this recipient)
2. Sends the Qi payment via BIP47

### Receive Payments

```typescript
// Register callback for incoming payments
wallet.onPaymentReceived((payment) => {
  console.log(`Received ${payment.amount} Qi`);
  if (payment.senderPaymentCode) {
    console.log(`From: ${payment.senderPaymentCode}`);
  }
});

// Register callback for new senders (via mailbox)
wallet.onSenderDiscovered((senderPaymentCode) => {
  console.log(`New sender discovered: ${senderPaymentCode}`);
});

// Start polling for payments (default: every 30 seconds)
wallet.startPolling();

// Or poll with custom interval
wallet.startPolling(10000); // every 10 seconds

// Stop polling when done
wallet.stopPolling();
```

### Convert Qi to Quai

```typescript
const txHash = await wallet.convertToQuai(
  '0x...quaiAddress',  // destination Quai address
  500000n              // amount of Qi to convert
);
```

### Persistence

```typescript
// Save wallet state
const serialized = wallet.serialize();
const json = JSON.stringify(serialized);
// Store `json` and `mnemonic` securely

// Restore wallet
const data = JSON.parse(storedJson);
const wallet = await QiAgentWallet.deserialize(data, mnemonic);
```

## Configuration

```typescript
import { QiAgentWallet, Zone } from '@quai/agent-sdk';

const wallet = await QiAgentWallet.create({
  // Network preset: 'mainnet' | 'orchard' | 'local'
  network: 'mainnet',
  
  // Or custom RPC URLs
  rpcUrl: 'https://rpc.quai.network',
  wsUrl: 'wss://rpc.quai.network',
  
  // Custom mailbox contract (if deploying your own)
  mailboxAddress: '0x004C82298b3ED69a949008d7037918B13A4260c5',
  
  // Polling interval in ms (default: 30000)
  pollingInterval: 15000,
  
  // Default zone for operations
  defaultZone: Zone.Cyprus1,
});
```

## How It Works

### Payment Codes (BIP47)

Each wallet has a payment code (starts with `PM8T...`). When Alice wants to pay Bob:

1. Alice uses Bob's payment code to derive a unique address
2. Alice sends Qi to that address
3. Bob can derive the same address using Alice's payment code
4. Bob scans for UTXOs at addresses derived from known senders

### Mailbox Contract

Since Qi doesn't support OP_RETURN, we use a Quai contract for sender notifications:

1. Before first payment, Alice calls `mailbox.notify(alicePC, bobPC)`
2. Bob checks `mailbox.getNotifications(bobPC)` to discover Alice
3. Now Bob knows to scan for payments from Alice

The SDK handles this automatically - just call `send()` and it notifies if needed.

## API Reference

### QiAgentWallet

| Method | Description |
|--------|-------------|
| `create(config?)` | Create new wallet with fresh mnemonic |
| `fromMnemonic(phrase, config?)` | Import wallet from mnemonic |
| `deserialize(data, mnemonic, config?)` | Restore from serialized state |
| `serialize()` | Serialize wallet state |
| `getPaymentCode()` | Get BIP47 payment code |
| `getBalance(zone?)` | Get balance for zone |
| `getTotalBalance()` | Get total across all zones |
| `send(recipient, amount, from?, to?)` | Send Qi payment |
| `convertToQuai(address, amount)` | Convert Qi to Quai |
| `sync(zone?)` | Sync UTXOs and notifications |
| `onPaymentReceived(callback)` | Register payment callback |
| `onSenderDiscovered(callback)` | Register sender callback |
| `startPolling(interval?)` | Start auto-sync |
| `stopPolling()` | Stop auto-sync |
| `getKnownSenders()` | List known sender payment codes |

## Network Info

| Network | RPC | Mailbox Contract |
|---------|-----|------------------|
| Mainnet | `https://rpc.quai.network` | `0x004C82298b3ED69a949008d7037918B13A4260c5` |
| Orchard | `https://orchard.rpc.quai.network` | TBD |

## License

MIT
