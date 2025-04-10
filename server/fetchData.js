const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.join(__dirname, 'database', 'stocks.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Function to fetch stock price data
async function fetchStockPrices(symbol, stockId) {
  try {
    // Using Alpha Vantage API (free tier)
    // Note: In a production environment, you would use a paid API with higher rate limits
    const apiKey = 'demo'; // Replace with your API key
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
    
    console.log(`Fetching data for ${symbol}...`);
    const response = await axios.get(url);
    
    if (response.data['Error Message']) {
      console.error(`Error fetching data for ${symbol}:`, response.data['Error Message']);
      return;
    }
    
    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      console.error(`No time series data found for ${symbol}`);
      return;
    }
    
    const priceData = [];
    for (const [date, data] of Object.entries(timeSeries)) {
      priceData.push({
        date,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume'])
      });
    }
    
    // Insert price data into database
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO stock_prices (stock_id, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      priceData.forEach(price => {
        stmt.run(
          stockId,
          price.date,
          price.open,
          price.high,
          price.low,
          price.close,
          price.volume
        );
      });
      
      stmt.finalize();
      
      db.run('COMMIT', function(err) {
        if (err) {
          console.error('Error committing transaction:', err.message);
        } else {
          console.log(`Successfully added ${priceData.length} price records for ${symbol}`);
        }
      });
    });
    
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
  }
}

// Function to fetch news for a stock
async function fetchStockNews(symbol, stockId) {
  try {
    // Using a mock news API for demonstration
    // In a production environment, you would use a real news API
    console.log(`Fetching news for ${symbol}...`);
    
    // Simulate news data (in a real app, you would fetch from an API)
    const newsData = [
      {
        title: `${symbol} Reports Strong Quarterly Earnings`,
        url: `https://example.com/news/${symbol.toLowerCase()}-earnings`,
        published_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source: 'Financial News'
      },
      {
        title: `${symbol} Announces New Product Line`,
        url: `https://example.com/news/${symbol.toLowerCase()}-product`,
        published_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source: 'Tech News'
      }
    ];
    
    // Insert news data into database
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (?, ?, ?, ?, ?, 0)'
    );
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      newsData.forEach(news => {
        stmt.run(
          stockId,
          news.title,
          news.url,
          news.published_date,
          news.source
        );
      });
      
      stmt.finalize();
      
      db.run('COMMIT', function(err) {
        if (err) {
          console.error('Error committing transaction:', err.message);
        } else {
          console.log(`Successfully added ${newsData.length} news records for ${symbol}`);
        }
      });
    });
    
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error.message);
  }
}

// Function to fetch market news
async function fetchMarketNews() {
  try {
    console.log('Fetching market news...');
    
    // Simulate market news data (in a real app, you would fetch from an API)
    const marketNewsData = [
      {
        title: 'Central Bank Announces Interest Rate Decision',
        url: 'https://example.com/news/central-bank-rates',
        published_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source: 'Economic News'
      },
      {
        title: 'Market Indices Hit All-Time High',
        url: 'https://example.com/news/market-high',
        published_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source: 'Market Watch'
      }
    ];
    
    // Insert market news data into database
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO news (stock_id, title, url, published_date, source, is_market_news) VALUES (NULL, ?, ?, ?, ?, 1)'
    );
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      marketNewsData.forEach(news => {
        stmt.run(
          news.title,
          news.url,
          news.published_date,
          news.source
        );
      });
      
      stmt.finalize();
      
      db.run('COMMIT', function(err) {
        if (err) {
          console.error('Error committing transaction:', err.message);
        } else {
          console.log(`Successfully added ${marketNewsData.length} market news records`);
        }
      });
    });
    
  } catch (error) {
    console.error('Error fetching market news:', error.message);
  }
}

// Main function to update all data
async function updateAllData() {
  // Get all stocks from the database
  db.all('SELECT id, symbol FROM stocks', [], async (err, stocks) => {
    if (err) {
      console.error('Error fetching stocks:', err.message);
      return;
    }
    
    console.log(`Found ${stocks.length} stocks to update`);
    
    // Fetch data for each stock
    for (const stock of stocks) {
      await fetchStockPrices(stock.symbol, stock.id);
      await fetchStockNews(stock.symbol, stock.id);
      
      // Add a delay to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Fetch market news
    await fetchMarketNews();
    
    console.log('Data update completed');
    db.close();
  });
}

// Check if this script is being run directly
if (require.main === module) {
  updateAllData();
}

module.exports = {
  fetchStockPrices,
  fetchStockNews,
  fetchMarketNews,
  updateAllData
};