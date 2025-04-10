import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import StockList from './components/StockList'
import StockDetail from './components/StockDetail'
import AddStockForm from './components/AddStockForm'

const API_BASE_URL = 'http://localhost:59187/api';

function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all stocks on component mount
  useEffect(() => {
    fetchStocks();
  }, []);

  // Fetch stock data when a stock is selected
  useEffect(() => {
    if (selectedStock) {
      fetchStockData(selectedStock.id);
    } else {
      setStockData(null);
    }
  }, [selectedStock]);

  // Fetch all stocks
  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/stocks`);
      setStocks(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch stocks. Please try again.');
      console.error('Error fetching stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data for a specific stock
  const fetchStockData = async (stockId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/stocks/${stockId}`);
      setStockData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch stock data. Please try again.');
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new stock
  const addStock = async (stockData) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/stocks`, stockData);
      fetchStocks();
      setError(null);
    } catch (err) {
      setError('Failed to add stock. Please try again.');
      console.error('Error adding stock:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update stock data
  const updateData = async () => {
    try {
      setIsUpdating(true);
      // This would trigger the backend to fetch new data
      // In a real app, you would have an endpoint for this
      alert('In a real application, this would trigger data updates from external APIs.');
      
      // Refresh the current stock data if a stock is selected
      if (selectedStock) {
        await fetchStockData(selectedStock.id);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to update data. Please try again.');
      console.error('Error updating data:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle stock selection
  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Stock Investment Visualization Tool</h1>
        <div className="header-actions">
          <button 
            className="update-button"
            onClick={updateData}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating Data...' : 'Update Data'}
          </button>
        </div>
      </header>
      
      <div className="main-content">
        <div className="sidebar">
          <AddStockForm addStock={addStock} />
          <StockList 
            stocks={stocks} 
            selectedStock={selectedStock}
            onSelectStock={handleSelectStock}
            loading={loading}
          />
        </div>
        
        <div className="content-area">
          {error && <div className="error-message">{error}</div>}
          
          {selectedStock ? (
            <StockDetail 
              stock={selectedStock}
              stockData={stockData}
              loading={loading}
            />
          ) : (
            <div className="no-selection">
              <p>Please select a stock from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App
