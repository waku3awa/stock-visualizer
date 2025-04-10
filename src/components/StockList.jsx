import React from 'react';

const StockList = ({ stocks, selectedStock, onSelectStock, loading }) => {
  return (
    <div className="stock-list">
      <h2>Stocks</h2>
      {loading && stocks.length === 0 ? (
        <div className="loading">Loading stocks...</div>
      ) : stocks.length === 0 ? (
        <div className="no-stocks">No stocks added yet. Add a stock to get started.</div>
      ) : (
        <ul>
          {stocks.map(stock => (
            <li 
              key={stock.id}
              className={selectedStock && selectedStock.id === stock.id ? 'selected' : ''}
              onClick={() => onSelectStock(stock)}
            >
              <div className="stock-item">
                <div className="stock-symbol">{stock.symbol}</div>
                <div className="stock-name">{stock.name}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StockList;