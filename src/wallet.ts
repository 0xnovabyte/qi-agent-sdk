import {
  QiHDWallet,
  Mnemonic,
  JsonRpcProvider,
  Zone,
  HDNodeWallet,
} from 'quais';
import { MailboxClient } from './mailbox';
import {
  QiAgentConfig,
  SerializedWallet,
  PaymentReceived,
  PaymentSent,
  ZoneBalance,
  PaymentReceivedCallback,
  SenderDiscoveredCallback,
  NETWORK_CONFIGS,
} from './types';
import { formatQi, parseQi, formatBalance, QI_UNITS } from './utils';

/**
 * High-level wallet for AI agents to send and receive Qi
 */
export class QiAgentWallet {
  private qiWallet: QiHDWallet;
  private provider: JsonRpcProvider;
  private mailbox: MailboxClient;
  private config: Required<QiAgentConfig>;
  private knownSenders: Set<string> = new Set();
  private lastScannedBlocks: Map<Zone, number> = new Map();
  private pollingTimer?: NodeJS.Timeout;
  private paymentCallbacks: PaymentReceivedCallback[] = [];
  private senderCallbacks: SenderDiscoveredCallback[] = [];
  private quaiSigner?: HDNodeWallet;

  private constructor(
    qiWallet: QiHDWallet,
    provider: JsonRpcProvider,
    mailbox: MailboxClient,
    config: Required<QiAgentConfig>,
    quaiSigner?: HDNodeWallet
  ) {
    this.qiWallet = qiWallet;
    this.provider = provider;
    this.mailbox = mailbox;
    this.config = config;
    this.quaiSigner = quaiSigner;
  }

  /**
   * Create a new wallet with a fresh mnemonic
   */
  static async create(config: QiAgentConfig = {}): Promise<{ wallet: QiAgentWallet; mnemonic: string }> {
    const fullConfig = QiAgentWallet.resolveConfig(config);
    
    // Generate new mnemonic
    const mnemonic = Mnemonic.fromEntropy(crypto.getRandomValues(new Uint8Array(16)));
    
    // Create QiHDWallet
    const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
    
    // Create provider
    const provider = new JsonRpcProvider(fullConfig.rpcUrl);
    
    // Connect wallet to provider
    qiWallet.connect(provider);
    
    // Create Quai signer for mailbox transactions (BIP44 path for Quai)
    const quaiSigner = HDNodeWallet.fromMnemonic(mnemonic, "m/44'/994'/0'/0/0").connect(provider);
    
    // Create mailbox client with signer
    const mailbox = new MailboxClient(fullConfig.mailboxAddress, quaiSigner);
    
    const wallet = new QiAgentWallet(qiWallet, provider, mailbox, fullConfig, quaiSigner);
    
    // Generate initial address
    await wallet.qiWallet.getNextAddress(0, fullConfig.defaultZone);
    
    return { wallet, mnemonic: mnemonic.phrase };
  }

  /**
   * Import a wallet from an existing mnemonic
   */
  static async fromMnemonic(
    mnemonicPhrase: string,
    config: QiAgentConfig = {}
  ): Promise<QiAgentWallet> {
    const fullConfig = QiAgentWallet.resolveConfig(config);
    
    const mnemonic = Mnemonic.fromPhrase(mnemonicPhrase);
    const qiWallet = QiHDWallet.fromMnemonic(mnemonic);
    
    const provider = new JsonRpcProvider(fullConfig.rpcUrl);
    qiWallet.connect(provider);
    
    const quaiSigner = HDNodeWallet.fromMnemonic(mnemonic, "m/44'/994'/0'/0/0").connect(provider);
    const mailbox = new MailboxClient(fullConfig.mailboxAddress, quaiSigner);
    
    const wallet = new QiAgentWallet(qiWallet, provider, mailbox, fullConfig, quaiSigner);
    
    // Scan for existing UTXOs and addresses
    await wallet.sync();
    
    return wallet;
  }

  /**
   * Restore wallet from serialized state
   */
  static async deserialize(
    data: SerializedWallet,
    mnemonicPhrase: string,
    config: QiAgentConfig = {}
  ): Promise<QiAgentWallet> {
    const wallet = await QiAgentWallet.fromMnemonic(mnemonicPhrase, config);
    
    // Restore known senders
    data.knownSenders.forEach(s => wallet.knownSenders.add(s));
    
    // Restore last scanned blocks
    Object.entries(data.lastScannedBlocks).forEach(([zone, block]) => {
      wallet.lastScannedBlocks.set(zone as Zone, block);
    });
    
    return wallet;
  }

  /**
   * Serialize wallet state for persistence
   */
  serialize(): SerializedWallet {
    const lastScannedBlocks: Record<string, number> = {};
    this.lastScannedBlocks.forEach((block, zone) => {
      lastScannedBlocks[zone] = block;
    });

    return {
      wallet: JSON.stringify(this.qiWallet.serialize()),
      paymentCode: this.getPaymentCode(),
      knownSenders: Array.from(this.knownSenders),
      lastScannedBlocks,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
  }

  /**
   * Get the wallet's BIP47 payment code
   * This is what you share with others so they can pay you
   */
  getPaymentCode(): string {
    return this.qiWallet.getPaymentCode(0);
  }

  /**
   * Get balance for a specific zone
   * Returns balance in Qit (smallest unit). Use formatBalance() for display.
   */
  async getBalance(zone: Zone = this.config.defaultZone): Promise<ZoneBalance> {
    const outpoints = this.qiWallet.getOutpoints(zone);
    
    let balance = 0n;
    let lockedBalance = 0n;
    
    for (const outpoint of outpoints) {
      // Get the actual Qit value from the denomination index
      const denomIndex = outpoint.outpoint.denomination;
      const { denominations } = await import('quais');
      balance += denominations[denomIndex] || 0n;
    }

    return {
      zone,
      balance,
      utxoCount: outpoints.length,
      lockedBalance,
    };
  }

  /**
   * Get human-readable balance string
   * @example "1.500 Qi"
   */
  async getBalanceDisplay(zone: Zone = this.config.defaultZone): Promise<string> {
    const { balance } = await this.getBalance(zone);
    return formatBalance(balance);
  }

  /**
   * Get total balance across all zones
   */
  async getTotalBalance(): Promise<bigint> {
    const zones: Zone[] = [
      Zone.Cyprus1,
      Zone.Cyprus2,
      Zone.Cyprus3,
      Zone.Paxos1,
      Zone.Paxos2,
      Zone.Paxos3,
      Zone.Hydra1,
      Zone.Hydra2,
      Zone.Hydra3,
    ];

    let total = 0n;
    for (const zone of zones) {
      try {
        const balance = await this.getBalance(zone);
        total += balance.balance;
      } catch {
        // Zone might not be available
      }
    }
    return total;
  }

  /**
   * Send Qi to a recipient (amount in Qit - smallest unit)
   * Automatically handles mailbox notification for new recipients
   * 
   * @param recipientPaymentCode - Recipient's BIP47 payment code
   * @param amount - Amount in Qit (smallest unit). Use parseQi("1.5") for 1.5 Qi.
   * @param originZone - Zone to send from
   * @param destinationZone - Zone to send to (defaults to same as origin)
   */
  async send(
    recipientPaymentCode: string,
    amount: bigint,
    originZone: Zone = this.config.defaultZone,
    destinationZone: Zone = originZone
  ): Promise<PaymentSent> {
    const myPaymentCode = this.getPaymentCode();
    
    // Check if we need to notify (first time sending to this recipient)
    const alreadyNotified = await this.mailbox.hasNotified(myPaymentCode, recipientPaymentCode);
    
    let notifyTxHash = '';
    if (!alreadyNotified) {
      console.log('Sending mailbox notification...');
      const notifyTx = await this.mailbox.notify(myPaymentCode, recipientPaymentCode);
      await notifyTx.wait();
      notifyTxHash = notifyTx.hash;
      console.log('Notification sent:', notifyTxHash);
    }
    
    // Send the Qi payment
    console.log('Sending Qi payment...');
    const txResponse = await this.qiWallet.sendTransaction(
      recipientPaymentCode,
      amount,
      originZone,
      destinationZone
    );
    
    console.log('Payment sent:', txResponse.hash);
    
    return {
      amount,
      recipientPaymentCode,
      qiTxHash: txResponse.hash,
      notifyTxHash,
      originZone,
      destinationZone,
      timestamp: Date.now(),
    };
  }

  /**
   * Send Qi using human-readable amount
   * 
   * @param recipientPaymentCode - Recipient's BIP47 payment code
   * @param qiAmount - Amount in Qi (e.g., "1.5" or 1.5 for 1.5 Qi)
   * @param originZone - Zone to send from
   * @param destinationZone - Zone to send to
   * 
   * @example
   * // Send 1.5 Qi
   * await wallet.sendQi(recipientPaymentCode, "1.5");
   * await wallet.sendQi(recipientPaymentCode, 1.5);
   */
  async sendQi(
    recipientPaymentCode: string,
    qiAmount: string | number,
    originZone: Zone = this.config.defaultZone,
    destinationZone: Zone = originZone
  ): Promise<PaymentSent> {
    const amount = parseQi(qiAmount);
    return this.send(recipientPaymentCode, amount, originZone, destinationZone);
  }

  /**
   * Convert Qi to Quai
   * 
   * @param quaiAddress - Destination Quai address
   * @param amount - Amount of Qi to convert (in Qit)
   */
  async convertToQuai(quaiAddress: string, amount: bigint): Promise<string> {
    const txResponse = await this.qiWallet.convertToQuai(quaiAddress, amount);
    return txResponse.hash;
  }

  /**
   * Sync wallet - discover senders and scan for UTXOs
   * Order matters: must open channels with senders BEFORE scanning
   */
  async sync(zone: Zone = this.config.defaultZone): Promise<void> {
    console.log(`Syncing wallet for zone ${zone}...`);
    
    // First, check mailbox for new senders and open payment channels
    // This must happen BEFORE scanning so we know which addresses to check
    const newSenders = await this.discoverSenders();
    if (newSenders.length > 0) {
      console.log(`Discovered ${newSenders.length} new sender(s)`);
    }
    
    // Now scan for UTXOs (including from newly opened channels)
    await this.qiWallet.scan(zone);
    
    console.log('Sync complete');
  }

  /**
   * Discover new senders from mailbox notifications and open payment channels
   * This is required for BIP47 - must open channel with sender to derive receive addresses
   */
  async discoverSenders(): Promise<string[]> {
    const myPaymentCode = this.getPaymentCode();
    const notifications = await this.mailbox.getNotifications(myPaymentCode);
    
    const newSenders: string[] = [];
    for (const senderPC of notifications) {
      if (!this.knownSenders.has(senderPC)) {
        this.knownSenders.add(senderPC);
        newSenders.push(senderPC);
        
        // Open BIP47 payment channel with this sender
        // This derives the addresses they will send to
        try {
          await this.qiWallet.openChannel(senderPC);
          console.log(`Opened payment channel with ${senderPC.slice(0, 20)}...`);
        } catch (err) {
          console.error(`Failed to open channel with ${senderPC.slice(0, 20)}...:`, err);
        }
        
        // Notify callbacks
        for (const callback of this.senderCallbacks) {
          try {
            await callback(senderPC);
          } catch (err) {
            console.error('Sender callback error:', err);
          }
        }
      }
    }
    
    return newSenders;
  }

  /**
   * Register callback for payment received events
   */
  onPaymentReceived(callback: PaymentReceivedCallback): () => void {
    this.paymentCallbacks.push(callback);
    return () => {
      const idx = this.paymentCallbacks.indexOf(callback);
      if (idx >= 0) this.paymentCallbacks.splice(idx, 1);
    };
  }

  /**
   * Register callback for new sender discovered events
   */
  onSenderDiscovered(callback: SenderDiscoveredCallback): () => void {
    this.senderCallbacks.push(callback);
    return () => {
      const idx = this.senderCallbacks.indexOf(callback);
      if (idx >= 0) this.senderCallbacks.splice(idx, 1);
    };
  }

  /**
   * Start polling for new payments and notifications
   */
  startPolling(interval: number = this.config.pollingInterval): void {
    if (this.pollingTimer) {
      this.stopPolling();
    }
    
    const poll = async () => {
      try {
        await this.sync();
      } catch (err) {
        console.error('Polling error:', err);
      }
    };
    
    // Initial sync
    poll();
    
    // Start interval
    this.pollingTimer = setInterval(poll, interval);
    console.log(`Started polling every ${interval}ms`);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
      console.log('Stopped polling');
    }
  }

  /**
   * Get list of known sender payment codes
   */
  getKnownSenders(): string[] {
    return Array.from(this.knownSenders);
  }

  /**
   * Get the underlying QiHDWallet (for advanced usage)
   */
  getQiWallet(): QiHDWallet {
    return this.qiWallet;
  }

  /**
   * Get the provider
   */
  getProvider(): JsonRpcProvider {
    return this.provider;
  }

  /**
   * Resolve config with defaults
   */
  private static resolveConfig(config: QiAgentConfig): Required<QiAgentConfig> {
    const network = config.network || 'mainnet';
    const networkConfig = NETWORK_CONFIGS[network];
    
    return {
      rpcUrl: config.rpcUrl || networkConfig.rpcUrl,
      wsUrl: config.wsUrl || networkConfig.wsUrl,
      network,
      mailboxAddress: config.mailboxAddress || networkConfig.mailboxAddress,
      pollingInterval: config.pollingInterval || 30000,
      defaultZone: config.defaultZone || Zone.Cyprus1,
    };
  }
}
