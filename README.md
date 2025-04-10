# Stock Investment Visualization Tool

A web application for visualizing stock investments, tracking performance, and making informed trading decisions.

## Features

- **Stock List Management**: Add and track multiple stocks in your portfolio
- **Price Visualization**: View historical price charts for each stock
- **Investment Tracking**: Calculate profit/loss for your holdings
- **Volatility Analysis**: Calculate historical volatility to help set stop-loss levels
- **Target & Stop-Loss Alerts**: Set price targets and stop-loss levels with visual alerts
- **News Integration**: View relevant news alongside price charts
- **Data Management**: Update stock data and news with a single click

## Technical Stack

- **Frontend**: React with Vite, Chart.js for visualizations
- **Backend**: Node.js with Express
- **Database**: SQLite for data storage
- **API Integration**: External APIs for stock data and news

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/stock-visualizer.git
   cd stock-visualizer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development servers (frontend and backend):
   ```
   npm run start
   ```

4. The application will be available at:
   - Frontend: http://localhost:51706
   - Backend API: http://localhost:59187

### Adding Stocks

1. Use the "Add Stock" button in the sidebar
2. Enter the stock symbol, company name, and optionally the sector
3. Click "Add" to save the stock to your list

### Adding Holdings

1. Select a stock from the list
2. Click "+ Add Holding" in the Holdings section
3. Enter purchase details (price, quantity, date)
4. Optionally set target price and stop-loss levels
5. Click "Add Holding" to save

### Updating Data

Click the "Update Data" button in the header to fetch the latest stock prices and news.

## Data Structure

The application uses SQLite with the following tables:

- **stocks**: Basic stock information (symbol, name, sector)
- **stock_prices**: Historical price data (date, open, high, low, close, volume)
- **user_holdings**: User's stock holdings (purchase date, price, quantity, targets)
- **news**: Stock-specific and market-wide news
- **dividends**: Dividend payment information

## Development

### Project Structure

```
stock-visualizer/
├── src/                  # Frontend React code
│   ├── components/       # React components
│   ├── App.jsx           # Main application component
│   └── App.css           # Application styles
├── server/               # Backend Node.js code
│   ├── server.js         # Express server
│   ├── fetchData.js      # Data fetching utilities
│   └── database/         # SQLite database
└── package.json          # Project configuration
```

### Available Scripts

- `npm run dev`: Start the frontend development server
- `npm run server`: Start the backend server
- `npm run start`: Start both frontend and backend servers
- `npm run build`: Build the frontend for production
- `npm run update-data`: Update stock data and news

## Future Enhancements

- Portfolio diversification analysis
- Technical indicators (Moving Averages, RSI, MACD)
- Dividend tracking and forecasting
- Tax calculation for realized gains/losses
- Mobile application version

## License

This project is licensed under the MIT License - see the LICENSE file for details.
