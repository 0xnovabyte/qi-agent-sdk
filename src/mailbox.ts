import {
  Contract,
  Interface,
  InterfaceAbi,
  FunctionFragment,
  EventFragment,
  JsonRpcProvider,
  Signer,
  Zone,
} from 'quais';

/**
 * Mailbox contract ABI
 */
export const MAILBOX_EVENTS = {
  NotificationSent: EventFragment.from(
    'NotificationSent(string senderPaymentCode, string receiverPaymentCode)'
  ),
};

const MAILBOX_FUNCTIONS = {
  notify: FunctionFragment.from(
    'notify(string senderPaymentCode, string receiverPaymentCode)'
  ),
  getNotifications: FunctionFragment.from(
    'getNotifications(string receiverPaymentCode) view returns (string[])'
  ),
};

export const MAILBOX_ABI: InterfaceAbi = [
  ...Object.values(MAILBOX_FUNCTIONS),
  ...Object.values(MAILBOX_EVENTS),
];

export const MAILBOX_INTERFACE: Interface = new Interface(MAILBOX_ABI);

/**
 * Wrapper for the PaymentChannelMailbox contract
 */
export class MailboxClient {
  private contract: Contract;
  private address: string;

  constructor(address: string, signerOrProvider: Signer | JsonRpcProvider) {
    this.address = address;
    this.contract = new Contract(address, MAILBOX_INTERFACE, signerOrProvider);
  }

  /**
   * Get the mailbox contract address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Send a notification to inform recipient of sender's payment code
   * This should be called BEFORE sending a Qi payment to a new recipient
   * 
   * @param senderPaymentCode - Sender's BIP47 payment code
   * @param receiverPaymentCode - Receiver's BIP47 payment code
   * @returns Transaction response
   */
  async notify(
    senderPaymentCode: string,
    receiverPaymentCode: string
  ): Promise<{ hash: string; wait: () => Promise<any> }> {
    const tx = await this.contract.notify(senderPaymentCode, receiverPaymentCode);
    return tx;
  }

  /**
   * Get all sender payment codes that have notified this recipient
   * 
   * @param receiverPaymentCode - Receiver's BIP47 payment code
   * @returns Array of sender payment codes
   */
  async getNotifications(receiverPaymentCode: string): Promise<string[]> {
    try {
      const notifications = await this.contract.getNotifications(receiverPaymentCode);
      return notifications as string[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Check if a specific sender has already notified a recipient
   * 
   * @param senderPaymentCode - Sender's payment code
   * @param receiverPaymentCode - Receiver's payment code
   * @returns True if already notified
   */
  async hasNotified(
    senderPaymentCode: string,
    receiverPaymentCode: string
  ): Promise<boolean> {
    const notifications = await this.getNotifications(receiverPaymentCode);
    return notifications.includes(senderPaymentCode);
  }

  /**
   * Listen for new notification events
   * 
   * @param receiverPaymentCode - Filter for specific receiver (optional)
   * @param callback - Callback when notification received
   * @returns Function to stop listening
   */
  onNotification(
    receiverPaymentCode: string | null,
    callback: (sender: string, receiver: string) => void
  ): () => void {
    const filter = this.contract.filters.NotificationSent();
    
    const listener = (senderPC: string, receiverPC: string) => {
      if (!receiverPaymentCode || receiverPC === receiverPaymentCode) {
        callback(senderPC, receiverPC);
      }
    };

    this.contract.on(filter, listener);

    return () => {
      this.contract.off(filter, listener);
    };
  }
}
