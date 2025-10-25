import { useMemo, useState } from 'react';
import { Container, Box, Typography, Paper, Button, List, ListItem, ListItemText, Divider, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Header from '../components/Header';
import { WithWallet, BROWSER_WALLET } from '../wallet';
import { useConnect, useConnection, WalletConnectionProps, ConnectorType } from '@concordium/react-components';
import { AccountTransactionType, getAccountTransactionHandler } from '@concordium/web-sdk';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type CartItem = { id: number; title: string; price_pence: number; seller: string; require_age18?: number; require_uk?: number };

function CheckoutInner(props: WalletConnectionProps & { connectorType: ConnectorType }) {
  const { activeConnector, connectedAccounts, genesisHashes, setActiveConnectorType } = props;
  const { connection, setConnection, account } = useConnection(connectedAccounts, genesisHashes);
  const { connect, isConnecting } = useConnect(activeConnector, setConnection);
  const navigate = useNavigate();
  const location = useLocation();
  const stateItems: CartItem[] = (location.state?.items as CartItem[]) || [];
  const storageItems: CartItem[] = JSON.parse(sessionStorage.getItem('zkshop_cart') || '[]');
  const initial: CartItem[] = stateItems.length ? stateItems : storageItems;
  const [cartItems, setCartItems] = useState<CartItem[]>(initial);
  const persist = (next: CartItem[]) => {
    setCartItems(next);
    sessionStorage.setItem('zkshop_cart', JSON.stringify(next));
  };
  // Aggregate quantities per product
  const lines = useMemo(() => {
    const m = new Map<number, { item: CartItem; qty: number }>();
    for (const it of cartItems) {
      const prev = m.get(it.id);
      if (prev) prev.qty += 1; else m.set(it.id, { item: it, qty: 1 });
    }
    return Array.from(m.values());
  }, [cartItems]);
  const total = lines.reduce((sum, l) => sum + (l.item.price_pence || 0) * l.qty, 0);

  const addOne = (it: CartItem) => persist([...cartItems, it]);
  const removeOne = (id: number) => {
    const idx = cartItems.findIndex((x) => x.id === id);
    if (idx >= 0) persist([...cartItems.slice(0, idx), ...cartItems.slice(idx + 1)]);
  };
  const removeAll = (id: number) => persist(cartItems.filter((x) => x.id !== id));

  const [successOpen, setSuccessOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const pay = async () => {
    if (!account || !connection || lines.length === 0) return;
    // Aggregate total to a single TokenUpdate (central shop)
    const anyLine = lines[0];
    const amountDecimal = total / 100;
    const res = await fetch('http://localhost:4000/purchase', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: anyLine.item.id, buyer: account, recipient: anyLine.item.seller, tokenId: 'EUDemo', amountDecimal })
    });
    const prep = await res.json();
    if (prep?.payload?.tokenId && prep?.payload?.operations) {
      const handler = getAccountTransactionHandler(AccountTransactionType.TokenUpdate);
      const typedPayload = handler.fromJSON(prep.payload);
      const h = await connection.signAndSendTransaction(account, AccountTransactionType.TokenUpdate, typedPayload);
      setTxHash(h);
      setSuccessOpen(true);
      sessionStorage.removeItem('zkshop_cart');
    } else {
      alert('Failed to prepare payment');
    }
  };

  return (
    <>
    <Header
      cartCount={lines.reduce((s, l) => s + l.qty, 0)}
      account={account}
      onConnect={() => { setActiveConnectorType(props.connectorType); connect(); }}
      isConnecting={isConnecting}
    />
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Checkout</Typography>
      </Box>
      <Paper sx={{ p: 2 }}>
        <List>
          {lines.map(({ item: it, qty }) => (
            <>
              <ListItem key={it.id}
                secondaryAction={
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton size="small" onClick={() => removeOne(it.id)} aria-label="decrement"><RemoveIcon /></IconButton>
                    <Typography>{qty}</Typography>
                    <IconButton size="small" onClick={() => addOne(it)} aria-label="increment"><AddIcon /></IconButton>
                    <Typography sx={{ ml: 2 }}>£{((it.price_pence*qty)/100).toFixed(2)}</Typography>
                    <IconButton size="small" onClick={() => removeAll(it.id)} aria-label="remove"><DeleteIcon /></IconButton>
                  </Box>
                }
              >
                <ListItemText primary={it.title} secondary={
                  <Box display="flex" gap={1}>
                    {it.require_age18 ? <Chip size="small" label="18+" /> : null}
                    {it.require_uk ? <Chip size="small" label="UK only" /> : null}
                  </Box>
                } />
              </ListItem>
              <Divider />
            </>
          ))}
        </List>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="h6">Total: £{(total/100).toFixed(2)}</Typography>
          <Button variant="contained" onClick={pay} disabled={!account}>Pay with EUDemo</Button>
        </Box>
      </Paper>
      <Box mt={2}><Button component={Link} to="/store">Back to Store</Button></Box>
      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)}>
        <DialogTitle>Payment Successful</DialogTitle>
        <DialogContent>
          <Typography>Your EUDemo payment has been submitted.</Typography>
          {txHash && (
            <Typography sx={{ mt: 1 }}>Transaction: <a href={`https://dashboard.testnet.concordium.com/lookup/transaction/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a></Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSuccessOpen(false); navigate('/store'); }} variant="contained">Continue</Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
}

export default function Checkout() {
  return (
    <WithWallet>
      {(props) => <CheckoutInner connectorType={BROWSER_WALLET} {...props} />}
    </WithWallet>
  );
}


