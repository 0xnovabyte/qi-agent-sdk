import { Zone } from 'quais';

/**
 * Configuration for the Qi Agent SDK
 */
export interface QiAgentConfig {
  /** RPC URL for the Quai network */
  rpcUrl?: string;
  /** WebSocket URL for real-time events */
  wsUrl?: string;
  /** Network: 'mainnet' | 'orchard' | 'local' */
  network?: 'mainnet' | 'orchard' | 'local';
  /** Mailbox contract address (defaults to mainnet) */
  mailboxAddress?: string;
  /** Polling interval in ms for UTXO scanning (default: 30000) */
  pollingInterval?: number;
  /** Default zone for operations */
  defaultZone?: Zone;
}

/**
 * Wallet state that can be serialized/persisted
 */
export interface SerializedWallet {
  /** Serialized QiHDWallet data */
  wallet: string;
  /** Payment code for receiving */
  paymentCode: string;
  /** Known sender payment codes */
  knownSenders: string[];
  /** Last scanned block per zone */
  lastScannedBlocks: Record<string, number>;
  /** Creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Payment received event
 */
export interface PaymentReceived {
  /** Amount in Qi (smallest unit) */
  amount: bigint;
  /** Sender's payment code (if known) */
  senderPaymentCode?: string;
  /** Transaction hash */
  txHash: string;
  /** Zone where payment was received */
  zone: Zone;
  /** Block number */
  blockNumber: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Payment sent confirmation
 */
export interface PaymentSent {
  /** Amount sent in Qi */
  amount: bigint;
  /** Recipient's payment code */
  recipientPaymentCode: string;
  /** Qi transaction hash */
  qiTxHash: string;
  /** Mailbox notification tx hash */
  notifyTxHash: string;
  /** Origin zone */
  originZone: Zone;
  /** Destination zone */
  destinationZone: Zone;
  /** Timestamp */
  timestamp: number;
}

/**
 * Balance info for a zone
 */
export interface ZoneBalance {
  /** Zone */
  zone: Zone;
  /** Total balance in Qi */
  balance: bigint;
  /** Number of UTXOs */
  utxoCount: number;
  /** Locked balance (unconfirmed) */
  lockedBalance: bigint;
}

/**
 * Callback for payment received events
 */
export type PaymentReceivedCallback = (payment: PaymentReceived) => void | Promise<void>;

/**
 * Callback for new sender discovered via mailbox
 */
export type SenderDiscoveredCallback = (senderPaymentCode: string) => void | Promise<void>;

/**
 * Network configuration presets
 */
export const NETWORK_CONFIGS = {
  mainnet: {
    rpcUrl: 'https://rpc.quai.network',
    wsUrl: 'wss://rpc.quai.network',
    mailboxAddress: '0x004C82298b3ED69a949008d7037918B13A4260c5',
  },
  orchard: {
    rpcUrl: 'https://orchard.rpc.quai.network',
    wsUrl: 'wss://orchard.rpc.quai.network',
    mailboxAddress: '0x004C82298b3ED69a949008d7037918B13A4260c5', // TODO: verify orchard address
  },
  local: {
    rpcUrl: 'http://localhost:8610',
    wsUrl: 'ws://localhost:8610',
    mailboxAddress: '', // Must be deployed locally
  },
} as const;
