import { useEffect, useState } from 'react';
import { Container, Box, Typography, TextField, Button, Checkbox, FormControlLabel, Paper, Divider, Alert, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Header from '../components/Header';
import { useConnect, useConnection, WalletConnectionProps, ConnectorType } from '@concordium/react-components';
import { WithWallet, BROWSER_WALLET } from '../wallet';

function SellerInner(props: WalletConnectionProps & { connectorType: ConnectorType }) {
  const { activeConnector, connectedAccounts, genesisHashes, setActiveConnectorType } = props;
  const { connection, setConnection, account } = useConnection(connectedAccounts, genesisHashes);
  const { connect, isConnecting, connectError } = useConnect(activeConnector, setConnection);

  const [shopName, setShopName] = useState('My ZK Shop');
  const [productTitle, setProductTitle] = useState('Demo Item');
  const [productDesc, setProductDesc] = useState('A great product');
  const [price, setPrice] = useState(10); // pounds
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [age18, setAge18] = useState(false);
  const [uk, setUk] = useState(false);
  const [shop, setShop] = useState<any | null>({ id: 1, name: 'ZKShop', owner: 'central' });
  const [wantConnect, setWantConnect] = useState(false);

  // Central shop: no per-owner fetch

  // Ensure an active connector is set before attempting to call connect()
  useEffect(() => {
    setActiveConnectorType(props.connectorType);
  }, [setActiveConnectorType, props.connectorType]);

  // Call connect once the activeConnector is ready
  useEffect(() => {
    if (wantConnect && activeConnector && typeof connect === 'function') {
      void connect();
      setWantConnect(false);
    }
  }, [wantConnect, activeConnector, connect]);

  const createShop = async () => {};

  const addProduct = async () => {
    await fetch('http://localhost:4000/products', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: productTitle, description: productDesc, pricePence: Math.round(Number(price) * 100), requireAge18: age18, requireUk: uk })
    });
    await refreshCatalogue();
  };

  const refreshCatalogue = async () => {
    const res = await fetch('http://localhost:4000/products');
    const data = await res.json();
    setCatalogue(data);
  };

  useEffect(() => { void refreshCatalogue(); }, []);

  const updateProduct = async (p: any, patch: Partial<any>) => {
    const body: any = {};
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.price_pence !== undefined) body.pricePence = patch.price_pence;
    if (patch.require_age18 !== undefined) body.requireAge18 = !!patch.require_age18;
    if (patch.require_uk !== undefined) body.requireUk = !!patch.require_uk;
    await fetch(`http://localhost:4000/products/${p.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    await refreshCatalogue();
  };

  const deleteProduct = async (id: number) => {
    await fetch(`http://localhost:4000/products/${id}`, { method: 'DELETE' });
    await refreshCatalogue();
  };

  return (
    <>
    <Header />
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Shop Config</Typography>
      </Box>
      {connectError && <Alert severity="error">{String(connectError)}</Alert>}
      

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">Catalog</Typography>
        <Typography variant="h6" mb={1}>Add Product</Typography>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField label="Title" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} />
          <TextField label="Description" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
          <TextField label="Price (£)" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <Divider />
          <Typography variant="subtitle1">ZK Requirements</Typography>
          <FormControlLabel control={<Checkbox checked={age18} onChange={(e) => setAge18(e.target.checked)} />} label="Require age ≥ 18" />
          <FormControlLabel control={<Checkbox checked={uk} onChange={(e) => setUk(e.target.checked)} />} label="Require UK nationality" />
          <Button variant="contained" onClick={addProduct} disabled={!shop}>Add Product</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">Catalogue</Typography>
        <Typography variant="h6" mb={1}>Current Products</Typography>
        <List>
          {catalogue.map((p) => (
            <ListItem key={p.id} alignItems="flex-start"
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => deleteProduct(p.id)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <Box display="flex" gap={2} alignItems="center">
                    <TextField size="small" label="Title" value={p.title} onChange={(e) => updateProduct(p, { title: e.target.value })} />
                    <TextField size="small" label="Price (£)" type="number" value={(p.price_pence/100).toFixed(2)} onChange={(e) => updateProduct(p, { price_pence: Math.round(Number(e.target.value) * 100) })} />
                  </Box>
                }
                secondary={
                  <Box display="flex" gap={2} mt={1}>
                    <TextField size="small" fullWidth label="Description" value={p.description} onChange={(e) => updateProduct(p, { description: e.target.value })} />
                    <FormControlLabel control={<Checkbox checked={!!p.require_age18} onChange={(e) => updateProduct(p, { require_age18: e.target.checked ? 1 : 0 })} />} label="18+" />
                    <FormControlLabel control={<Checkbox checked={!!p.require_uk} onChange={(e) => updateProduct(p, { require_uk: e.target.checked ? 1 : 0 })} />} label="UK" />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
    </>
  );
}

export default function Seller() {
  return (
    <WithWallet>
      {(props) => <SellerInner connectorType={BROWSER_WALLET} {...props} />}
    </WithWallet>
  );
}


