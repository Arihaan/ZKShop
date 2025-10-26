import { useEffect, useMemo, useState } from 'react';
import { Container, Box, Typography, Grid, Card, CardContent, Button, Chip, Snackbar, Alert, Fab, ButtonGroup, CircularProgress, Stack } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Header from '../components/Header';
import { WithWallet, BROWSER_WALLET } from '../wallet';
import { useConnect, useConnection, WalletConnectionProps, ConnectorType } from '@concordium/react-components';
import { Web3StatementBuilder, MIN_DATE, getPastDate, AccountAddress, AccountTransactionType, StatementTypes } from '@concordium/web-sdk';

const grpcUrl = 'https://grpc.testnet.concordium.com';
const grpcPort = 20000;
const TOKEN_ID = 'EUDemo';

async function requestVP(connection: any, statements: any) {
  const challenge = crypto.randomUUID().replace(/-/g, '').padEnd(64, '0');
  console.log('[ZKShop] requestVP: challenge', challenge);
  console.log('[ZKShop] requestVP: statements', JSON.stringify(statements));
  if (!connection || typeof connection.requestVerifiablePresentation !== 'function') {
    const keys = connection ? Object.keys(connection) : [];
    throw new Error('requestVerifiablePresentation not available on connection. keys=' + JSON.stringify(keys));
  }
  try {
    const res = await connection.requestVerifiablePresentation(challenge, statements);
    console.log('[ZKShop] requestVP: response', res);
    return res;
  } catch (e) {
    const msg = (e as Error)?.message ?? '';
    if (msg.includes('Another prompt is already open')) {
      console.warn('[ZKShop] prompt busy, retrying once in 1200ms');
      await new Promise((r) => setTimeout(r, 1200));
      const retryChallenge = crypto.randomUUID().replace(/-/g, '').padEnd(64, '0');
      console.log('[ZKShop] requestVP (retry): challenge', retryChallenge);
      return connection.requestVerifiablePresentation(retryChallenge, statements);
    }
    throw e;
  }
}

function StoreInner(props: WalletConnectionProps & { connectorType: ConnectorType }) {
  const { activeConnector, connectedAccounts, genesisHashes, setActiveConnectorType } = props;
  const { connection, setConnection, account } = useConnection(connectedAccounts, genesisHashes);
  const { connect, isConnecting, connectError } = useConnect(activeConnector, setConnection);

  const [products, setProducts] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>('0');
  const [cart, setCart] = useState<any[]>([]);
  const quantityOf = (id: number) => cart.filter((x) => x.id === id).length;
  const addToCart = (p: any) => setCart((c) => [...c, p]);
  const removeFromCart = (id: number) => setCart((c) => {
    const i = c.findIndex((x) => x.id === id);
    if (i >= 0) return [...c.slice(0, i), ...c.slice(i + 1)];
    return c;
  });
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [queuedProduct, setQueuedProduct] = useState<any | null>(null);
  const [toast, setToast] = useState<{open: boolean; msg: string; severity: 'success'|'info'|'warning'|'error'}>({open:false,msg:'',severity:'info'});

  useEffect(() => {
    fetch('http://localhost:4000/products').then((r) => r.json()).then(setProducts);
  }, []);

  useEffect(() => {
    // Ensure connector type is set on mount
    setActiveConnectorType(BROWSER_WALLET);
  }, [setActiveConnectorType]);

  useEffect(() => {
    // Auto-connect if user opted in and we're not connected yet
    const shouldAuto = localStorage.getItem('zkshop_autoconnect') === '1';
    if (shouldAuto && !account && typeof connect === 'function' && activeConnector) {
      connect();
    }
  }, [activeConnector, connect, account]);

  useEffect(() => {
    if (account) {
      fetch(`http://localhost:4000/plt/balance/${TOKEN_ID}/${account}`).then((r) => r.json()).then((x) => setBalance(x.balance || '0'));
    }
  }, [account]);

  const verifyAndAdd = async (p: any) => {
    if (!connection || !account) return;
    if (isVerifying) {
      setQueuedProduct(p);
      setToast({ open: true, msg: 'Verification in progress. Close existing wallet prompt to switch item.', severity: 'warning' });
      return;
    }
    if (verifyingId === p.id) return; // prevent duplicate prompt per item
    setVerifyingId(p.id);
    setIsVerifying(true);
    // Build a single presentation request combining requirements to avoid multiple prompts
    try {
      console.log('[ZKShop] verify start', { account, age18: !!p.require_age18, uk: !!p.require_uk });
      if (p.require_age18 || p.require_uk) {
        const builder = new Web3StatementBuilder();
        builder.addForIdentityCredentials([0, 1, 2, 3, 4, 5], (b: any) => {
          if (p.require_age18 && typeof b.addRange === 'function') {
            b.addRange('dob', MIN_DATE, getPastDate(18, 1));
          }
          if (p.require_uk) {
            if (typeof b.addAttributeInSet === 'function') {
              b.addAttributeInSet('nationality', ['GB']);
            } else if (typeof b.addInSet === 'function') {
              b.addInSet('nationality', ['GB']);
            }
          }
        });
        let statements = builder.getStatements();
        console.log('[ZKShop] built statements (builder)', statements);
        // Fallback for nationality if builder produced empty statements in current SDK
        if (
          p.require_uk &&
          Array.isArray(statements) &&
          statements.length > 0 &&
          Array.isArray((statements[0] as any).statement) &&
          (statements[0] as any).statement.length === 0
        ) {
          statements = [{
            statement: [{ type: StatementTypes.AttributeInSet, attributeTag: 'nationality', set: ['GB'] }],
            idQualifier: { type: 'cred', issuers: [0] },
          }];
          console.log('[ZKShop] fallback nationality statements', statements);
        }
        await requestVP(connection, statements);
      }
      addToCart(p);
      setToast({open:true,msg:'Item verified and added to cart.',severity:'success'});
    } catch (e) {
      console.error('[ZKShop] verification error', e);
      const msg = (e as Error)?.message?.includes('Another prompt is already open')
        ? 'Wallet prompt already open. Please finish or close it.'
        : 'Verification failed or cancelled.';
      setToast({open:true,msg, severity: (e as Error)?.message?.includes('already open') ? 'warning' : 'error'});
    }
    finally {
      setVerifyingId(null);
      setIsVerifying(false);
      if (queuedProduct) {
        const next = queuedProduct;
        setQueuedProduct(null);
        setTimeout(() => verifyAndAdd(next), 300);
      }
    }
  };

  return (
    <>
    <Header
      cartCount={cart.length}
      account={account}
      onConnect={() => { localStorage.setItem('zkshop_autoconnect', '1'); setActiveConnectorType(BROWSER_WALLET); if (typeof connect === 'function') connect(); }}
      isConnecting={isConnecting}
      balanceLabel={account ? `EUDemo ${balance}` : undefined}
    />
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Catalogue</Typography>
      </Box>
      {connectError && <Typography color="error">{String(connectError)}</Typography>}

      <Grid container spacing={2}>
        {products.map((p) => (
          <Grid item xs={12} md={6} key={p.id}>
            <Card sx={{ borderRadius: 3, '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' } }}>
              <CardContent>
                <Stack spacing={1.25}>
                  <Typography variant="h6">{p.title}</Typography>
                  <Typography color="text.secondary">{p.description}</Typography>
                  <Box display="flex" gap={1}>
                    {p.require_age18 ? <Chip size="small" label="18+" color="warning" variant="outlined" /> : null}
                    {p.require_uk ? <Chip size="small" label="UK only" color="info" variant="outlined" /> : null}
                  </Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                    <Typography variant="h6">£{(p.price_pence/100).toFixed(2)}</Typography>
                    {quantityOf(p.id) === 0 ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => verifyAndAdd(p)}
                        disabled={!account || isVerifying}
                        sx={{ minWidth: 140 }}
                      >
                        {verifyingId === p.id ? (<><CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />Verifying…</>) : 'Verify & Add'}
                      </Button>
                    ) : (
                      <ButtonGroup size="small" variant="outlined" aria-label="quantity">
                        <Button onClick={() => removeFromCart(p.id)}>-</Button>
                        <Button disabled>{quantityOf(p.id)}</Button>
                        <Button onClick={() => addToCart(p)}>+</Button>
                      </ButtonGroup>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography>Cart: {cart.length} item(s)</Typography>
        <Button variant="outlined" disabled={cart.length===0} onClick={() => {
          // simple: navigate with state
          window.location.href = '/checkout';
          sessionStorage.setItem('zkshop_cart', JSON.stringify(cart));
        }}>Go to Checkout</Button>
      </Box>
      <Fab color="primary" aria-label="cart" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={() => { window.location.href = '/checkout'; sessionStorage.setItem('zkshop_cart', JSON.stringify(cart)); }}>
        <ShoppingCartIcon />
      </Fab>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({...toast, open:false})}>
        <Alert severity={toast.severity} onClose={() => setToast({...toast, open:false})}>{toast.msg}</Alert>
      </Snackbar>
    </Container>
    </>
  );
}

export default function Store() {
  return (
    <WithWallet>
      {(props) => <StoreInner connectorType={BROWSER_WALLET} {...props} />}
    </WithWallet>
  );
}


