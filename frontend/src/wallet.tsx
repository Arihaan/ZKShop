import { TESTNET, WithWalletConnector } from '@concordium/react-components';
import { ephemeralConnectorType, BrowserWalletConnector } from '@concordium/react-components';
export const BROWSER_WALLET = ephemeralConnectorType(BrowserWalletConnector.create);
export function WithWallet({ children }: { children: (props: any) => JSX.Element }) {
  return (
    <WithWalletConnector network={TESTNET}>
      {(props) => children(props)}
    </WithWalletConnector>
  );
}

// Simple session persistence helper
export function usePersistedConnect(connect: () => void) {
  const key = 'zkshop_autoconnect';
  return {
    tryAutoConnect: () => { if (localStorage.getItem(key) === '1') connect(); },
    markConnected: () => localStorage.setItem(key, '1'),
    clear: () => localStorage.removeItem(key),
  };
}


