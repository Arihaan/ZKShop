import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import App from './pages/App';
import Seller from './pages/Seller';
import Store from './pages/Store';
import Checkout from './pages/Checkout';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/seller', element: <Seller /> },
  { path: '/store', element: <Store /> },
  { path: '/checkout', element: <Checkout /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);


