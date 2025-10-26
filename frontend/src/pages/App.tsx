import { Link } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import Header from '../components/Header';
import { WithWallet, BROWSER_WALLET } from '../wallet';
import { useConnect, useConnection, WalletConnectionProps, ConnectorType } from '@concordium/react-components';
import React from 'react';

function AppInner(props: WalletConnectionProps & { connectorType: ConnectorType }) {
  const { activeConnector, connectedAccounts, genesisHashes, setActiveConnectorType } = props;
  const { connection, setConnection, account } = useConnection(connectedAccounts, genesisHashes);
  const { connect, isConnecting } = useConnect(activeConnector, setConnection);
  const [balance, setBalance] = React.useState<string>('0');
  const TOKEN_ID = 'EUDemo';

  React.useEffect(() => { setActiveConnectorType(BROWSER_WALLET); }, [setActiveConnectorType]);
  React.useEffect(() => {
    const shouldAuto = localStorage.getItem('zkshop_autoconnect') === '1';
    if (shouldAuto && !account && typeof connect === 'function' && activeConnector) connect();
  }, [activeConnector, connect, account]);

  React.useEffect(() => {
    if (account) {
      fetch(`http://localhost:4000/plt/balance/${TOKEN_ID}/${account}`)
        .then((r) => r.json())
        .then((x) => setBalance(x.balance || '0'))
        .catch(() => setBalance('0'));
    }
  }, [account]);

  return (
    <>
    <Header
      account={account}
      onConnect={() => { localStorage.setItem('zkshop_autoconnect', '1'); setActiveConnectorType(BROWSER_WALLET); if (typeof connect === 'function') connect(); }}
      isConnecting={isConnecting}
      balanceLabel={account ? `EUDemo ${balance}` : undefined}
    />
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Paper elevation={0} sx={{ p: 6, borderRadius: 4, background: 'linear-gradient(180deg, #ffffff, #f3f6fb)' }}>
        <Box display="flex" flexDirection="column" gap={2} alignItems="center">
          <Typography variant="h4">ZKShop</Typography>
          <Typography color="text.secondary">Spin up a simple store with zero-knowledge gated items and PLT payments.</Typography>
          <Box display="flex" gap={2}>
            <Button component={Link} to="/seller" variant="contained">Seller Dashboard</Button>
            <Button component={Link} to="/store" variant="outlined">Open Storefront</Button>
          </Box>
        </Box>
      </Paper>
    </Container>
    </>
  );
}

export default function App() {
  return (
    <WithWallet>
      {(props) => <AppInner connectorType={BROWSER_WALLET} {...props} />}
    </WithWallet>
  );
}


