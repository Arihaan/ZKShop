import { Link } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import Header from '../components/Header';

export default function App() {
  return (
    <>
    <Header />
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Paper elevation={0} sx={{ p: 6, borderRadius: 4, background: 'linear-gradient(180deg, #ffffff, #f3f6fb)' }}>
        <Box display="flex" flexDirection="column" gap={2} alignItems="center">
          <Typography variant="h4">ZKShop</Typography>
          <Typography color="text.secondary">Spin up a simple store with zero-knowledge gated items and EUDemo payments.</Typography>
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


