import React, { useState } from 'react';

const AddStockForm = ({ addStock }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!symbol.trim() || !name.trim()) {
      setError('Symbol and name are required');
      return;
    }
    
    addStock({
      symbol: symbol.toUpperCase().trim(),
      name: name.trim(),
      sector: sector.trim()
    });
    
    // Reset form
    setSymbol('');
    setName('');
    setSector('');
    setError('');
    setIsFormOpen(false);
  };

  return (
    <div className="add-stock-form">
      {!isFormOpen ? (
        <button 
          className="add-stock-button"
          onClick={() => setIsFormOpen(true)}
        >
          + Add Stock
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <h3>Add New Stock</h3>
          
          {error && <div className="form-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="symbol">Symbol</label>
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. AAPL"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Company Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apple Inc."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="sector">Sector (Optional)</label>
            <input
              type="text"
              id="sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="e.g. Technology"
            />
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={() => setIsFormOpen(false)}>
              Cancel
            </button>
            <button type="submit">
              Add
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddStockForm;