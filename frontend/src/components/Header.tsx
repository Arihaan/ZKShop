import { AppBar, Toolbar, Typography, Box, Button, IconButton, Badge, Avatar, Chip } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useNavigate } from 'react-router-dom';

function shorten(addr: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export default function Header(props: { cartCount?: number; account?: string; onConnect?: () => void; isConnecting?: boolean; balanceLabel?: string }) {
  const navigate = useNavigate();
  const cart = props.cartCount ?? 0;
  const { account, onConnect, isConnecting, balanceLabel } = props;
  return (
    <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(15,23,42,0.06)', backdropFilter: 'blur(6px)' }}>
      <Toolbar sx={{ py: 1 }}>
        <Box display="flex" alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => navigate('/') }>
          <img src="/logo.png" alt="logo" style={{ width: 24, height: 24, marginRight: 8, borderRadius: 6 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>ZKShop</Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" onClick={() => navigate('/store')}>Store</Button>
        <Button color="inherit" onClick={() => navigate('/seller')}>Shop Config</Button>
        <IconButton color="primary" onClick={() => navigate('/checkout')} sx={{ ml: 1 }}>
          <Badge badgeContent={cart} color="secondary">
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
        <Box sx={{ ml: 2 }}>
          {!account ? (
            <Button variant="contained" size="small" onClick={onConnect} disabled={isConnecting}>Connect</Button>
          ) : (
            <Chip
              avatar={<Avatar sx={{ width: 24, height: 24 }}>{account[0]}</Avatar>}
              label={balanceLabel ? `${shorten(account)} · ${balanceLabel}` : shorten(account)}
              variant="outlined"
              onClick={() => navigate('/checkout')}
            />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}


