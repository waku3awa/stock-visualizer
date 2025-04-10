import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

const API_BASE_URL = 'http://localhost:59187/api';

const StockDetail = ({ stock, stockData, loading }) => {
  const [holdings, setHoldings] = useState([]);
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [volatility, setVolatility] = useState(null);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stockData && stockData.holdings) {
      setHoldings(stockData.holdings);
    }
  }, [stockData]);

  useEffect(() => {
    if (stock && stock.id) {
      fetchVolatility(stock.id);
    }
  }, [stock]);

  const fetchVolatility = async (stockId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stocks/${stockId}/volatility`);
      setVolatility(response.data);
    } catch (err) {
      console.error('Error fetching volatility:', err);
    }
  };

  const handleAddHolding = async (e) => {
    e.preventDefault();
    
    if (!purchasePrice || !quantity || !purchaseDate) {
      setError('Purchase price, quantity, and date are required');
      return;
    }
    
    try {
      await axios.post(`${API_BASE_URL}/holdings`, {
        stock_id: stock.id,
        purchase_date: purchaseDate,
        purchase_price: parseFloat(purchasePrice),
        quantity: parseInt(quantity),
        target_price: targetPrice ? parseFloat(targetPrice) : null,
        stop_loss_price: stopLossPrice ? parseFloat(stopLossPrice) : null
      });
      
      // Refresh stock data
      const response = await axios.get(`${API_BASE_URL}/stocks/${stock.id}`);
      setHoldings(response.data.holdings);
      
      // Reset form
      setPurchasePrice('');
      setQuantity('');
      setPurchaseDate('');
      setTargetPrice('');
      setStopLossPrice('');
      setShowAddHolding(false);
      setError('');
    } catch (err) {
      setError('Failed to add holding. Please try again.');
      console.error('Error adding holding:', err);
    }
  };

  const calculateTotalInvestment = () => {
    return holdings.reduce((total, holding) => {
      return total + (holding.purchase_price * holding.quantity);
    }, 0);
  };

  const calculateCurrentValue = () => {
    if (!stockData || !stockData.prices || stockData.prices.length === 0) {
      return 0;
    }
    
    const currentPrice = stockData.prices[stockData.prices.length - 1].close;
    
    return holdings.reduce((total, holding) => {
      return total + (currentPrice * holding.quantity);
    }, 0);
  };

  const calculateProfit = () => {
    const totalInvestment = calculateTotalInvestment();
    const currentValue = calculateCurrentValue();
    
    return currentValue - totalInvestment;
  };

  const calculateProfitPercentage = () => {
    const totalInvestment = calculateTotalInvestment();
    const profit = calculateProfit();
    
    if (totalInvestment === 0) {
      return 0;
    }
    
    return (profit / totalInvestment) * 100;
  };

  const prepareChartData = () => {
    if (!stockData || !stockData.prices || stockData.prices.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    const prices = stockData.prices;
    const labels = prices.map(price => price.date);
    const data = prices.map(price => price.close);
    
    // Prepare annotations for target and stop-loss prices
    const annotations = [];
    
    // Add target and stop-loss lines for each holding
    holdings.forEach((holding, index) => {
      if (holding.target_price) {
        annotations.push({
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y',
          value: holding.target_price,
          borderColor: 'green',
          borderWidth: 1,
          label: {
            content: `Target: ${holding.target_price}`,
            enabled: true,
            position: 'right'
          }
        });
      }
      
      if (holding.stop_loss_price) {
        annotations.push({
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y',
          value: holding.stop_loss_price,
          borderColor: 'red',
          borderWidth: 1,
          label: {
            content: `Stop-Loss: ${holding.stop_loss_price}`,
            enabled: true,
            position: 'right'
          }
        });
      }
    });
    
    // Add purchase points
    const purchasePoints = holdings.map(holding => {
      return {
        x: holding.purchase_date,
        y: holding.purchase_price
      };
    });
    
    return {
      labels,
      datasets: [
        {
          label: `${stock.symbol} Price`,
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1
        },
        {
          label: 'Purchase Points',
          data: purchasePoints,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
          }
        }
      },
      annotation: {
        annotations: {
          // Annotations will be added dynamically
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Price ($)'
        }
      }
    }
  };

  // Check if we need to show stop-loss alerts
  const checkAlerts = () => {
    if (!stockData || !stockData.prices || stockData.prices.length === 0 || holdings.length === 0) {
      return null;
    }
    
    const currentPrice = stockData.prices[stockData.prices.length - 1].close;
    const alerts = [];
    
    holdings.forEach((holding, index) => {
      if (holding.stop_loss_price && currentPrice <= holding.stop_loss_price) {
        alerts.push(
          <div key={index} className="alert alert-danger">
            Stop-Loss Alert: Current price (${currentPrice.toFixed(2)}) is below your stop-loss price (${holding.stop_loss_price.toFixed(2)})
          </div>
        );
      }
      
      if (holding.target_price && currentPrice >= holding.target_price) {
        alerts.push(
          <div key={`target-${index}`} className="alert alert-success">
            Target Price Alert: Current price (${currentPrice.toFixed(2)}) has reached your target price (${holding.target_price.toFixed(2)})
          </div>
        );
      }
    });
    
    return alerts.length > 0 ? <div className="alerts">{alerts}</div> : null;
  };

  // Render news items
  const renderNews = () => {
    if (!stockData || !stockData.news || stockData.news.length === 0) {
      return <div className="no-news">No news available</div>;
    }
    
    return (
      <div className="news-list">
        {stockData.news.map((news, index) => (
          <div key={index} className="news-item">
            <h4>{news.title}</h4>
            <div className="news-meta">
              <span className="news-date">{news.published_date}</span>
              <span className="news-source">{news.source}</span>
            </div>
            {news.url && (
              <a href={news.url} target="_blank" rel="noopener noreferrer">
                Read More
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render volatility information
  const renderVolatility = () => {
    if (!volatility) {
      return <div className="no-volatility">Volatility data not available</div>;
    }
    
    return (
      <div className="volatility-info">
        <h4>Volatility (Last {volatility.period} Days)</h4>
        <div className="volatility-data">
          <div className="volatility-item">
            <span className="label">Daily:</span>
            <span className="value">{(volatility.daily_volatility * 100).toFixed(2)}%</span>
          </div>
          <div className="volatility-item">
            <span className="label">Annualized:</span>
            <span className="value">{(volatility.annualized_volatility * 100).toFixed(2)}%</span>
          </div>
          <div className="volatility-item">
            <span className="label">Suggested Stop-Loss (2x Daily):</span>
            <span className="value">
              {stockData && stockData.prices && stockData.prices.length > 0 ? 
                `$${(stockData.prices[stockData.prices.length - 1].close * (1 - volatility.daily_volatility * 2)).toFixed(2)}` : 
                'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading stock data...</div>;
  }

  if (!stock) {
    return <div className="no-stock">No stock selected</div>;
  }

  return (
    <div className="stock-detail">
      <div className="stock-header">
        <h2>{stock.name} ({stock.symbol})</h2>
        {stock.sector && <div className="stock-sector">Sector: {stock.sector}</div>}
      </div>
      
      {checkAlerts()}
      
      <div className="stock-chart">
        <Line data={prepareChartData()} options={chartOptions} />
      </div>
      
      <div className="stock-info-grid">
        <div className="stock-holdings">
          <div className="section-header">
            <h3>Holdings</h3>
            <button 
              className="add-holding-button"
              onClick={() => setShowAddHolding(!showAddHolding)}
            >
              {showAddHolding ? 'Cancel' : '+ Add Holding'}
            </button>
          </div>
          
          {showAddHolding && (
            <form className="add-holding-form" onSubmit={handleAddHolding}>
              {error && <div className="form-error">{error}</div>}
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="purchasePrice">Purchase Price</label>
                  <input
                    type="number"
                    id="purchasePrice"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="purchaseDate">Purchase Date</label>
                <input
                  type="date"
                  id="purchaseDate"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="targetPrice">Target Price (Optional)</label>
                  <input
                    type="number"
                    id="targetPrice"
                    step="0.01"
                    min="0"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="stopLossPrice">Stop-Loss Price (Optional)</label>
                  <input
                    type="number"
                    id="stopLossPrice"
                    step="0.01"
                    min="0"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                  />
                </div>
              </div>
              
              <button type="submit" className="submit-button">
                Add Holding
              </button>
            </form>
          )}
          
          {holdings.length === 0 ? (
            <div className="no-holdings">No holdings added yet</div>
          ) : (
            <div className="holdings-list">
              <table>
                <thead>
                  <tr>
                    <th>Purchase Date</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Target</th>
                    <th>Stop-Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding, index) => (
                    <tr key={index}>
                      <td>{holding.purchase_date}</td>
                      <td>${holding.purchase_price.toFixed(2)}</td>
                      <td>{holding.quantity}</td>
                      <td>${(holding.purchase_price * holding.quantity).toFixed(2)}</td>
                      <td>{holding.target_price ? `$${holding.target_price.toFixed(2)}` : '-'}</td>
                      <td>{holding.stop_loss_price ? `$${holding.stop_loss_price.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {holdings.length > 0 && stockData && stockData.prices && stockData.prices.length > 0 && (
            <div className="profit-summary">
              <div className="summary-item">
                <span className="label">Total Investment:</span>
                <span className="value">${calculateTotalInvestment().toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Current Value:</span>
                <span className="value">${calculateCurrentValue().toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Profit/Loss:</span>
                <span className={`value ${calculateProfit() >= 0 ? 'profit' : 'loss'}`}>
                  ${calculateProfit().toFixed(2)} ({calculateProfitPercentage().toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="stock-volatility">
          {renderVolatility()}
        </div>
      </div>
      
      <div className="stock-news">
        <h3>Related News</h3>
        {renderNews()}
      </div>
    </div>
  );
};

export default StockDetail;