import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#10b981' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, boxShadow: '0 6px 12px rgba(37,99,235,0.15)' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { transition: 'transform .2s ease, box-shadow .2s ease' },
      },
    },
  },
});


