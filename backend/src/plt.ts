import { ConcordiumGRPCNodeClient } from '@concordium/web-sdk/nodejs';
import { credentials } from '@grpc/grpc-js';
import { AccountAddress } from '@concordium/web-sdk';
import { TokenId, Token, TokenAmount, TokenHolder, Cbor, CborMemo } from '@concordium/web-sdk/plt';
import { createTokenUpdatePayload } from '@concordium/web-sdk/plt';
import { AccountTransactionType } from '@concordium/web-sdk';
import { parseWallet, buildAccountSigner } from '@concordium/web-sdk';
import { readFileSync } from 'node:fs';

export function createNodeClient(host = 'grpc.testnet.concordium.com', port = 20000) {
  return new ConcordiumGRPCNodeClient(host, Number(port), credentials.createSsl());
}

export async function getPltBalance(tokenId: string, account: string) {
  const client = createNodeClient();
  const info = await client.getAccountInfo(AccountAddress.fromBase58(account));
  const token = info.accountTokens.find((t) => t.id.value === tokenId);
  if (!token) return '0';
  // balance as string
  // @ts-expect-error: shape varies in sdk versions
  return (token.state.balance?.toString?.() ?? '0') as string;
}

export async function transferPlt(params: {
  tokenId: string;
  recipient: string;
  amountDecimal: number;
}) {
  const { tokenId, recipient, amountDecimal } = params;
  const client = createNodeClient();

  // Load governance/service wallet export from ./wallet/wallet.export
  const walletFile = readFileSync('wallet/wallet.export', 'utf8');
  if (!walletFile) throw new Error('Missing wallet export at wallet/wallet.export');
  const walletExport = parseWallet(walletFile);
  const sender = AccountAddress.fromBase58(walletExport.value.address);
  const signer = buildAccountSigner(walletExport);

  const id = TokenId.fromString(tokenId);
  const token = await Token.fromId(client, id);
  const amount = TokenAmount.fromDecimal(amountDecimal, token.info.state.decimals);
  const recipientHolder = TokenHolder.fromAccountAddress(AccountAddress.fromBase58(recipient));

  const txHash = await Token.transfer(token, sender, { recipient: recipientHolder, amount, memo: CborMemo.fromString('ZKShop purchase') }, signer);
  const result = await client.waitForTransactionFinalization(txHash);
  return { txHash: txHash.toString(), result };
}

// Prepare a wallet-signable TokenUpdate payload for buyer-signed flow
export async function prepareBuyerTransferPayload(params: {
  tokenId: string;
  sender: string;
  recipient: string;
  amountDecimal: number;
}) {
  const { tokenId, sender, recipient, amountDecimal } = params;
  const id = TokenId.fromString(tokenId);
  const client = createNodeClient();
  const token = await Token.fromId(client, id);
  const decimals = token.info.state.decimals;
  const amount = TokenAmount.fromDecimal(amountDecimal, decimals);
  const recipientHolder = TokenHolder.fromAccountAddress(AccountAddress.fromBase58(recipient));

  const operations = [{
    transfer: {
      recipient: recipientHolder,
      amount
    }
  } as const];

  const payload = createTokenUpdatePayload(id, operations);
  const operationsHex = Cbor.toHexString(payload.operations as unknown as Cbor.Type);
  const payloadJson = {
    tokenId,
    operations: operationsHex,
  };
  return { payload: payloadJson };
}


