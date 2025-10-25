import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { proofRouter } from './proof.js';
import { getPltBalance, transferPlt, prepareBuyerTransferPayload } from './plt.js';

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database('zkshop.db');

db.exec(`
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_pence INTEGER NOT NULL,
  require_age18 INTEGER NOT NULL DEFAULT 0,
  require_uk INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  buyer TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/proof', proofRouter);

app.get('/plt/balance/:tokenId/:account', async (req, res) => {
  try {
    const bal = await getPltBalance(req.params.tokenId, req.params.account);
    res.json({ balance: bal });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Purchase endpoint: executes PLT transfer after proofs have been handled client-side (PoC)
app.post('/purchase', async (req, res) => {
  try {
    const { productId, buyer, recipient, tokenId, amountDecimal } = req.body as {
      productId: number; buyer: string; recipient: string; tokenId: string; amountDecimal: number;
    };
    console.log('purchase request', { productId, buyer, recipient, tokenId, amountDecimal });
    if (!productId || !buyer || !recipient || !tokenId || typeof amountDecimal !== 'number') {
      return res.status(400).json({ error: 'Missing fields' });
    }
    // Return a wallet-signable TokenUpdate payload to the frontend for buyer-signed transfer
    const prepared = await prepareBuyerTransferPayload({ tokenId, sender: buyer, recipient, amountDecimal });
    res.json(prepared);
  } catch (e) {
    console.error('purchase error', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// Central shop: ensure default shop exists
const ensureDefaultShop = db.prepare('INSERT INTO shops (id, owner, name) VALUES (1, ?, ?) ON CONFLICT(id) DO NOTHING');
ensureDefaultShop.run('central', 'ZKShop');

// Products
app.post('/products', (req, res) => {
  const { title, description, pricePence, requireAge18, requireUk } = req.body as {
    title: string; description?: string; pricePence: number; requireAge18?: boolean; requireUk?: boolean;
  };
  if (!title || typeof pricePence !== 'number') return res.status(400).json({ error: 'title, pricePence required' });
  const stmt = db.prepare(`INSERT INTO products (shop_id, title, description, price_pence, require_age18, require_uk) VALUES (1, ?, ?, ?, ?, ?)`);
  const info = stmt.run(title, description ?? '', pricePence, requireAge18 ? 1 : 0, requireUk ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});

app.get('/products', (_req, res) => {
  const rows = db.prepare('SELECT p.*, s.owner as seller FROM products p JOIN shops s ON s.id = p.shop_id ORDER BY p.created_at DESC').all();
  res.json(rows);
});

app.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ deleted: info.changes > 0 });
});

app.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, description, pricePence, requireAge18, requireUk } = req.body as {
    title?: string; description?: string; pricePence?: number; requireAge18?: boolean; requireUk?: boolean;
  };
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!row) return res.status(404).json({ error: 'not found' });
  const next = {
    title: title ?? row.title,
    description: description ?? row.description,
    price_pence: typeof pricePence === 'number' ? pricePence : row.price_pence,
    require_age18: requireAge18 === undefined ? row.require_age18 : (requireAge18 ? 1 : 0),
    require_uk: requireUk === undefined ? row.require_uk : (requireUk ? 1 : 0),
  };
  db.prepare('UPDATE products SET title = ?, description = ?, price_pence = ?, require_age18 = ?, require_uk = ? WHERE id = ?')
    .run(next.title, next.description, next.price_pence, next.require_age18, next.require_uk, id);
  const updated = db.prepare('SELECT p.*, (SELECT owner FROM shops s WHERE s.id = p.shop_id) as seller FROM products p WHERE p.id = ?').get(id);
  res.json(updated);
});

// Orders
app.post('/orders', (req, res) => {
  const { productId, buyer, amountPence } = req.body as { productId: number; buyer: string; amountPence: number };
  if (!productId || !buyer || typeof amountPence !== 'number') return res.status(400).json({ error: 'productId, buyer, amountPence required' });
  const stmt = db.prepare('INSERT INTO orders (product_id, buyer, amount_pence) VALUES (?, ?, ?)');
  const info = stmt.run(productId, buyer, amountPence);
  res.json({ id: info.lastInsertRowid, status: 'pending' });
});

app.get('/orders', (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/orders/:id/mark-paid', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  const info = stmt.run('paid', id);
  if (info.changes === 0) return res.status(404).json({ error: 'order not found' });
  res.json({ id, status: 'paid' });
});

app.get('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT p.*, s.owner as seller FROM products p JOIN shops s ON s.id = p.shop_id WHERE p.id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`zkshop backend listening on http://localhost:${port}`);
});


