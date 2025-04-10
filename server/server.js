const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 59187;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'database', 'stocks.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Create stocks table
  db.run(`CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sector TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create stock_prices table
  db.run(`CREATE TABLE IF NOT EXISTS stock_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    FOREIGN KEY (stock_id) REFERENCES stocks (id),
    UNIQUE(stock_id, date)
  )`);

  // Create user_holdings table
  db.run(`CREATE TABLE IF NOT EXISTS user_holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    purchase_date TEXT NOT NULL,
    purchase_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    target_price REAL,
    stop_loss_price REAL,
    FOREIGN KEY (stock_id) REFERENCES stocks (id)
  )`);

  // Create news table
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER,
    title TEXT NOT NULL,
    url TEXT,
    published_date TEXT NOT NULL,
    source TEXT,
    is_market_news BOOLEAN DEFAULT 0,
    FOREIGN KEY (stock_id) REFERENCES stocks (id)
  )`);

  // Create dividends table
  db.run(`CREATE TABLE IF NOT EXISTS dividends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    ex_date TEXT NOT NULL,
    payment_date TEXT,
    amount REAL NOT NULL,
    FOREIGN KEY (stock_id) REFERENCES stocks (id)
  )`);
}

// API Routes

// Get all stocks
app.get('/api/stocks', (req, res) => {
  db.all('SELECT * FROM stocks ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new stock
app.post('/api/stocks', (req, res) => {
  const { symbol, name, sector } = req.body;
  
  if (!symbol || !name) {
    return res.status(400).json({ error: 'Symbol and name are required' });
  }
  
  db.run(
    'INSERT INTO stocks (symbol, name, sector) VALUES (?, ?, ?)',
    [symbol, name, sector],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        id: this.lastID,
        symbol,
        name,
        sector
      });
    }
  );
});

// Get stock data for a specific stock
app.get('/api/stocks/:id', (req, res) => {
  const stockId = req.params.id;
  
  db.get('SELECT * FROM stocks WHERE id = ?', [stockId], (err, stock) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    // Get price data
    db.all(
      'SELECT date, open, high, low, close, volume FROM stock_prices WHERE stock_id = ? ORDER BY date',
      [stockId],
      (err, prices) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Get holdings data
        db.all(
          'SELECT * FROM user_holdings WHERE stock_id = ?',
          [stockId],
          (err, holdings) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            // Get news data
            db.all(
              'SELECT * FROM news WHERE stock_id = ? OR is_market_news = 1 ORDER BY published_date DESC LIMIT 50',
              [stockId],
              (err, news) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                
                // Get dividend data
                db.all(
                  'SELECT * FROM dividends WHERE stock_id = ? ORDER BY ex_date DESC',
                  [stockId],
                  (err, dividends) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({
                      stock,
                      prices,
                      holdings,
                      news,
                      dividends
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Add stock price data
app.post('/api/stocks/:id/prices', (req, res) => {
  const stockId = req.params.id;
  const priceData = req.body;
  
  if (!Array.isArray(priceData)) {
    return res.status(400).json({ error: 'Price data must be an array' });
  }
  
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO stock_prices (stock_id, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let hasError = false;
    priceData.forEach(price => {
      if (!price.date || !price.close) {
        hasError = true;
        return;
      }
      
      stmt.run(
        stockId,
        price.date,
        price.open || price.close,
        price.high || price.close,
        price.low || price.close,
        price.close,
        price.volume || 0,
        function(err) {
          if (err) {
            hasError = true;
            console.error('Error inserting price data:', err.message);
          }
        }
      );
    });
    
    stmt.finalize();
    
    if (hasError) {
      db.run('ROLLBACK');
      return res.status(500).json({ error: 'Error inserting price data' });
    }
    
    db.run('COMMIT', function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Price data added successfully' });
    });
  });
});

// Add user holdings
app.post('/api/holdings', (req, res) => {
  const { stock_id, purchase_date, purchase_price, quantity, target_price, stop_loss_price } = req.body;
  
  if (!stock_id || !purchase_date || !purchase_price || !quantity) {
    return res.status(400).json({ error: 'Stock ID, purchase date, price, and quantity are required' });
  }
  
  db.run(
    'INSERT INTO user_holdings (stock_id, purchase_date, purchase_price, quantity, target_price, stop_loss_price) VALUES (?, ?, ?, ?, ?, ?)',
    [stock_id, purchase_date, purchase_price, quantity, target_price, stop_loss_price],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        id: this.lastID,
        stock_id,
        purchase_date,
        purchase_price,
        quantity,
        target_price,
        stop_loss_price
      });
    }
  );
});

// Update user holdings
app.put('/api/holdings/:id', (req, res) => {
  const holdingId = req.params.id;
  const { target_price, stop_loss_price } = req.body;
  
  db.run(
    'UPDATE user_holdings SET target_price = ?, stop_loss_price = ? WHERE id = ?',
    [target_price, stop_loss_price, holdingId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Holding not found' });
      }
      
      res.json({ message: 'Holding updated successfully' });
    }
  );
});

// Add news
app.post('/api/news', (req, res) => {
  const { stock_id, title, url, published_date, source, is_market_news } = req.body;
  
  if (!title || !published_date) {
    return res.status(400).json({ error: 'Title and published date are required' });
  }
  
  db.run(
    'INSERT INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, ?)',
    [stock_id, title, url, published_date, source, is_market_news ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        id: this.lastID,
        stock_id,
        title,
        url,
        published_date,
        source,
        is_market_news
      });
    }
  );
});

// Calculate volatility
app.get('/api/stocks/:id/volatility', (req, res) => {
  const stockId = req.params.id;
  const period = req.query.period || 20; // Default to 20 days
  
  db.all(
    'SELECT date, close FROM stock_prices WHERE stock_id = ? ORDER BY date DESC LIMIT ?',
    [stockId, parseInt(period)],
    (err, prices) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (prices.length < 2) {
        return res.status(400).json({ error: 'Not enough price data to calculate volatility' });
      }
      
      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        const previousClose = prices[i].close;
        const currentClose = prices[i-1].close;
        const dailyReturn = Math.log(currentClose / previousClose);
        returns.push(dailyReturn);
      }
      
      // Calculate standard deviation of returns
      const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
      const squaredDifferences = returns.map(value => Math.pow(value - mean, 2));
      const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      // Annualize the volatility (assuming 252 trading days in a year)
      const annualizedVolatility = stdDev * Math.sqrt(252);
      
      res.json({
        period,
        daily_volatility: stdDev,
        annualized_volatility: annualizedVolatility
      });
    }
  );
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});