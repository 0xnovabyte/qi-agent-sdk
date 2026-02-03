# Infrastructure Gaps for Qi Agent SDK

## What go-quai ALREADY HAS ✅

### 1. UTXO Storage & Indexing
- Address → Outpoints mapping stored in LevelDB
- `WriteAddressOutpoints()` / `ReadOutpointsForAddress()` in `core/rawdb/accessors_chain.go`
- Indexed by address prefix for efficient lookups

### 2. RPC Methods
```
quai_getBalance(address)              → Returns sum of UTXOs
quai_getOutpointsByAddress(address)   → Returns all UTXOs for address
quai_getOutPointsByAddressAndRange()  → Paginated UTXO query
quai_sendRawTransaction()             → Submit signed Qi tx
```

### 3. Transaction Types
- `QiTx` struct with TxIn/TxOut (UTXO model)
- Schnorr signatures
- 15 fixed denominations (0.001 Qi to 1,000,000 Qi)
- Cross-zone transfer support (ETX creation)

### 4. Event Subscriptions (EVM-focused)
- `SubscribeLogsEvent` - EVM log events
- `SubscribeChainHeadEvent` - New block headers
- `SubscribePendingLogsEvent` - Pending EVM logs

---

## What's MISSING ❌

### 1. UTXO Event Subscription (CRITICAL)
**Gap:** No `SubscribeUTXOEvent` or similar for Qi transactions.

**Current state:** Agents must POLL `quai_getOutpointsByAddress` to detect incoming payments.

**What's needed in go-quai:**
```go
// New subscription type needed
func (b *Backend) SubscribeNewUTXOEvent(ch chan<- NewUTXOEvent) event.Subscription

type NewUTXOEvent struct {
    Address     common.Address
    TxHash      common.Hash
    Index       uint16
    Denomination uint8
    BlockNumber uint64
}
```

**Workaround for now:** Poll-based watching with configurable interval.

---

### 2. Payment Code Support (IMPORTANT for privacy)
**Gap:** No BIP47-style payment code implementation.

**Current state:** Agents share single address → anyone can track balance.

**What's needed:**
1. Payment code generation from HD seed
2. Derivation of one-time addresses per sender
3. Indexer that watches ALL derived addresses (could be 1000s)

**Workaround for now:** Use single address (no privacy).

**Future infra needed:**
- Payment code derivation library (can be in SDK)
- Extended indexer that maps payment_code → [derived_addresses]
- RPC method: `quai_getOutpointsByPaymentCode(paymentCode)`

---

### 3. Multi-Address Watching
**Gap:** RPC only queries one address at a time.

**What's needed:**
```
quai_getOutpointsByAddresses([addr1, addr2, ...])  // Batch query
quai_subscribeAddresses([addr1, addr2, ...])       // Multi-address subscription
```

**Workaround:** Parallel polling of multiple addresses.

---

### 4. Webhook/Push Notification Service
**Gap:** No built-in webhook system for payment notifications.

**What's needed:** Separate indexer service that:
1. Watches chain for new Qi transactions
2. Matches outputs to registered addresses
3. POSTs to registered webhook URLs

**This is NOT a go-quai change** - it's a separate service.

---

## Recommended Infra Build Order

### Phase 1: SDK with Polling (works TODAY)
- Use existing RPC methods
- Poll-based balance watching
- Single address per agent

### Phase 2: UTXO Subscription in go-quai
- Add `SubscribeNewUTXOEvent`
- WebSocket push for new UTXOs
- Reduces polling overhead

### Phase 3: Payment Code Support
- SDK: Payment code derivation
- go-quai: Batch address queries
- Indexer: Payment code → addresses mapping

### Phase 4: Webhook Service (separate repo)
- Standalone service
- Subscribes to go-quai events
- Manages webhook registrations
- POSTs to agent endpoints

---

## go-quai Changes Required (PRs needed)

### Minimal (Phase 2):
1. `core/events.go` - Add `NewUTXOEvent` type
2. `quai/filters/` - Add UTXO filter support
3. `internal/quaiapi/` - Add `quai_subscribeUTXOs` RPC method

### Extended (Phase 3):
1. Batch address query RPC
2. Payment code aware indexing (if built into node)

---

## Questions for Quai Team

1. Is UTXO subscription something you'd accept as a PR to go-quai?
2. Should payment code indexing be in-node or separate service?
3. Any existing plans for agent-focused infrastructure?
