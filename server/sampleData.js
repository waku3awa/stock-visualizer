const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database setup
const dbPath = path.join(__dirname, 'database', 'stocks.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
  
  // Initialize database and add sample data
  initializeDatabase()
    .then(addSampleStocks)
    .then(addSamplePrices)
    .then(addSampleHoldings)
    .then(addSampleNews)
    .then(() => {
      console.log('Sample data added successfully.');
      db.close();
    })
    .catch(err => {
      console.error('Error adding sample data:', err);
      db.close();
    });
});

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Create stocks table
    db.run(`CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sector TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) return reject(err);
      
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
      )`, (err) => {
        if (err) return reject(err);
        
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
        )`, (err) => {
          if (err) return reject(err);
          
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
          )`, (err) => {
            if (err) return reject(err);
            
            // Create dividends table
            db.run(`CREATE TABLE IF NOT EXISTS dividends (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              stock_id INTEGER NOT NULL,
              ex_date TEXT NOT NULL,
              payment_date TEXT,
              amount REAL NOT NULL,
              FOREIGN KEY (stock_id) REFERENCES stocks (id)
            )`, (err) => {
              if (err) return reject(err);
              
              resolve();
            });
          });
        });
      });
    });
  });
}

// Add sample stocks
function addSampleStocks() {
  return new Promise((resolve, reject) => {
    const stocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Cyclical' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Automotive' }
    ];
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const stmt = db.prepare('INSERT OR IGNORE INTO stocks (symbol, name, sector) VALUES (?, ?, ?)');
      
      stocks.forEach(stock => {
        stmt.run(stock.symbol, stock.name, stock.sector);
      });
      
      stmt.finalize();
      
      db.run('COMMIT', (err) => {
        if (err) return reject(err);
        console.log(`Added ${stocks.length} sample stocks.`);
        resolve();
      });
    });
  });
}

// Add sample price data
function addSamplePrices() {
  return new Promise((resolve, reject) => {
    // Get all stocks
    db.all('SELECT id, symbol FROM stocks', [], (err, stocks) => {
      if (err) return reject(err);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(
          'INSERT OR IGNORE INTO stock_prices (stock_id, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        
        // Generate 60 days of sample price data for each stock
        const today = new Date();
        let totalPrices = 0;
        
        stocks.forEach(stock => {
          let basePrice;
          switch (stock.symbol) {
            case 'AAPL': basePrice = 180.0; break;
            case 'MSFT': basePrice = 350.0; break;
            case 'GOOGL': basePrice = 140.0; break;
            case 'AMZN': basePrice = 170.0; break;
            case 'TSLA': basePrice = 220.0; break;
            default: basePrice = 100.0;
          }
          
          for (let i = 60; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Generate random price movement (-3% to +3%)
            const movement = (Math.random() * 6 - 3) / 100;
            const close = basePrice * (1 + movement);
            const open = close * (1 + (Math.random() * 2 - 1) / 100);
            const high = Math.max(open, close) * (1 + Math.random() / 100);
            const low = Math.min(open, close) * (1 - Math.random() / 100);
            const volume = Math.floor(Math.random() * 10000000) + 1000000;
            
            stmt.run(
              stock.id,
              dateStr,
              open.toFixed(2),
              high.toFixed(2),
              low.toFixed(2),
              close.toFixed(2),
              volume
            );
            
            // Update base price for next day
            basePrice = close;
            totalPrices++;
          }
        });
        
        stmt.finalize();
        
        db.run('COMMIT', (err) => {
          if (err) return reject(err);
          console.log(`Added ${totalPrices} sample price records.`);
          resolve();
        });
      });
    });
  });
}

// Add sample holdings
function addSampleHoldings() {
  return new Promise((resolve, reject) => {
    // Get all stocks
    db.all('SELECT id, symbol FROM stocks', [], (err, stocks) => {
      if (err) return reject(err);
      
      // Sample purchase dates (30 and 15 days ago)
      const today = new Date();
      const date30 = new Date(today);
      date30.setDate(date30.getDate() - 30);
      const date30Str = date30.toISOString().split('T')[0];
      
      const date15 = new Date(today);
      date15.setDate(date15.getDate() - 15);
      const date15Str = date15.toISOString().split('T')[0];
      
      // Process stocks sequentially to avoid SQLite issues
      const processStock = (index) => {
        if (index >= stocks.length) {
          console.log(`Added sample holdings.`);
          return resolve();
        }
        
        const stock = stocks[index];
        
        // Get current price
        db.get(
          'SELECT close FROM stock_prices WHERE stock_id = ? ORDER BY date DESC LIMIT 1',
          [stock.id],
          (err, price) => {
            if (err || !price) {
              console.error(`Error getting price for ${stock.symbol}:`, err);
              processStock(index + 1);
              return;
            }
            
            const currentPrice = parseFloat(price.close);
            
            db.run('BEGIN TRANSACTION', () => {
              // Add first holding (30 days ago)
              const purchase1Price = currentPrice * 0.9; // 10% lower than current
              db.run(
                'INSERT OR IGNORE INTO user_holdings (stock_id, purchase_date, purchase_price, quantity, target_price, stop_loss_price) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  stock.id,
                  date30Str,
                  purchase1Price.toFixed(2),
                  100, // quantity
                  (currentPrice * 1.2).toFixed(2), // target: 20% higher
                  (purchase1Price * 0.9).toFixed(2) // stop-loss: 10% lower than purchase
                ],
                (err) => {
                  if (err) {
                    console.error(`Error adding holding for ${stock.symbol}:`, err);
                    db.run('ROLLBACK');
                    processStock(index + 1);
                    return;
                  }
                  
                  // Add second holding (15 days ago) for some stocks
                  if (['AAPL', 'MSFT', 'AMZN'].includes(stock.symbol)) {
                    const purchase2Price = currentPrice * 0.95; // 5% lower than current
                    db.run(
                      'INSERT OR IGNORE INTO user_holdings (stock_id, purchase_date, purchase_price, quantity, target_price, stop_loss_price) VALUES (?, ?, ?, ?, ?, ?)',
                      [
                        stock.id,
                        date15Str,
                        purchase2Price.toFixed(2),
                        50, // quantity
                        (currentPrice * 1.15).toFixed(2), // target: 15% higher
                        (purchase2Price * 0.92).toFixed(2) // stop-loss: 8% lower than purchase
                      ],
                      (err) => {
                        if (err) {
                          console.error(`Error adding second holding for ${stock.symbol}:`, err);
                          db.run('ROLLBACK');
                        } else {
                          db.run('COMMIT');
                        }
                        processStock(index + 1);
                      }
                    );
                  } else {
                    db.run('COMMIT');
                    processStock(index + 1);
                  }
                }
              );
            });
          }
        );
      };
      
      // Start processing stocks
      processStock(0);
    });
  });
}

// Add sample news
function addSampleNews() {
  return new Promise((resolve, reject) => {
    // Get all stocks
    db.all('SELECT id, symbol, name FROM stocks', [], (err, stocks) => {
      if (err) return reject(err);
      
      // Generate dates for news
      const today = new Date();
      const dates = [];
      for (let i = 1; i <= 30; i += 5) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) return reject(err);
        
        let completed = 0;
        let totalToAdd = stocks.length * 3 + 3; // 3 news per stock + 3 market news
        
        // Function to check if all inserts are done
        const checkCompletion = () => {
          completed++;
          if (completed === totalToAdd) {
            db.run('COMMIT', (err) => {
              if (err) return reject(err);
              console.log(`Added ${totalToAdd} sample news items.`);
              resolve();
            });
          }
        };
        
        // Add stock-specific news
        stocks.forEach(stock => {
          // Earnings news
          db.run(
            'INSERT OR IGNORE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, ?)',
            [
              stock.id,
              `${stock.name} Reports Strong Quarterly Earnings`,
              `https://example.com/news/${stock.symbol.toLowerCase()}-earnings`,
              dates[0],
              'Financial News',
              0 // not market news
            ],
            (err) => {
              if (err) console.error('Error adding news:', err);
              checkCompletion();
            }
          );
          
          // Product news
          db.run(
            'INSERT OR IGNORE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, ?)',
            [
              stock.id,
              `${stock.name} Announces New Product Line`,
              `https://example.com/news/${stock.symbol.toLowerCase()}-product`,
              dates[1],
              'Tech News',
              0 // not market news
            ],
            (err) => {
              if (err) console.error('Error adding news:', err);
              checkCompletion();
            }
          );
          
          // Analyst rating
          db.run(
            'INSERT OR IGNORE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, ?)',
            [
              stock.id,
              `Analysts Upgrade ${stock.symbol} to "Buy"`,
              `https://example.com/news/${stock.symbol.toLowerCase()}-upgrade`,
              dates[2],
              'Market Watch',
              0 // not market news
            ],
            (err) => {
              if (err) console.error('Error adding news:', err);
              checkCompletion();
            }
          );
        });
        
        // Add market news
        db.run(
          'INSERT OR IGNORE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, ?)',
          [
            null, // no specific stock
            'Central Bank Announces Interest Rate Decision',
            'https://example.com/news/central-bank-rates',
            dates[3],
            'Economic News',
            1 // market news
          ],
          (err) => {
            if (err) console.error('Error adding news:', err);
            checkCompletion();
          }
        );
        
        db.run(
          'INSERT OR IGNORE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, ?)',
          [
            null, // no specific stock
            'Market Indices Hit All-Time High',
            'https://example.com/news/market-high',
            dates[4],
            'Market Watch',
            1 // market news
          ],
          (err) => {
            if (err) console.error('Error adding news:', err);
            checkCompletion();
          }
        );
        
        db.run(
          'INSERT OR IGNORE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, ?)',
          [
            null, // no specific stock
            'Global Economic Outlook Improves',
            'https://example.com/news/economic-outlook',
            dates[5],
            'Economic News',
            1 // market news
          ],
          (err) => {
            if (err) console.error('Error adding news:', err);
            checkCompletion();
          }
        );
      });
    });
  });
}

// If this script is run directly
if (require.main === module) {
  console.log('Adding sample data to the database...');
}