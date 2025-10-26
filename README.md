# ZKShop (Concordium PoC)

<img width="1920" height="1080" alt="displayimage1" src="https://github.com/user-attachments/assets/7292cb75-dc46-43fc-b3a4-b316baddeea1" />

A lightweight, modern demo shop for the Concordium blockchain that showcases:

- Zero-knowledge gated products (18+ and UK nationality)
- Buyer-signed PLT (Protocol Level Token) payments using the EUDemo token
- Clean, mobile-friendly UI with a central shop configuration

## Features

- Wallet connect (persistent auto-connect)
- Age (≥18) and UK nationality ZK proof requests via the Concordium Web SDK
- Cart with per-item quantity controls and checkout aggregation
- Buyer-signed PLT TokenUpdate payment (EUDemo)
- Central shop config page to add/edit/delete products
- Polished UI: header with wallet chip, hover cards, success modal with explorer link

## Tech Stack

- Frontend: React + Vite + TypeScript, MUI, @concordium/react-components, @concordium/web-sdk
- Backend: Express + SQLite, @concordium/web-sdk (nodejs client)

## Prerequisites

- Node.js 18+
- Concordium Wallet for Web (testnet)
- Testnet account with EUDemo balance and permissions to transfer

## Quick Start

1) Backend

```bash
cd zkshop/backend
npm install
npm run dev
```

This starts on http://localhost:4000 and creates a local SQLite DB (gitignored).

2) Frontend

```bash
cd zkshop/frontend
npm install
npm run dev
```

Open http://localhost:5175

## How it Works

- Proof gating uses `requestVerifiablePresentation` with a builder that encodes statements for:
  - Age ≥ 18 (date of birth in range)
  - Nationality ∈ {GB}
- After verification, items can be added; quantities are adjustable in both the product card and at checkout.
- Checkout aggregates the cart total and requests a TokenUpdate payload from the backend for the `EUDemo` PLT.
- The browser wallet signs a TokenUpdate (buyer-signed) and submits it. A success dialog shows an explorer link to the transaction.

## Pages

- Store: Browse products, verify & add, adjust per-item quantities.
- Checkout: Edit quantities, remove items, connect wallet, pay with EUDemo, success modal with link.
- Shop Config: Centralized admin; add products (price in £), edit title/description/price/ZK flags, delete items.

## Configuration

- Backend port: 4000 (Express)
- Frontend port: 5175 (Vite)
- Testnet gRPC endpoints are used by the frontend and backend clients.

## Troubleshooting

- “Another prompt is already open”: Close any existing wallet popup and retry.
- Token update deserialization failures: Ensure the `tokenId` and decimals match the on-chain PLT and that buyer has EUDemo and is allowed to transfer.
- Wallet connection: The header’s Connect button stores a flag for auto-connect; clear with `localStorage.removeItem('zkshop_autoconnect')` if needed.

## Notes

- This PoC is intentionally simple; payment uses a single TokenUpdate for the aggregated total.
- For production, verify ZK proofs on a backend, manage sessions, and add robust error handling and auditing.

## License

MIT (demo code)
