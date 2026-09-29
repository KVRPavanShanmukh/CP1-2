import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8080/api/simulations';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }
};

function Simulation() {
  const [formData, setFormData] = useState({
    nodeCount: 10,
    consensusType: 'PoW',
    networkTopology: 'Erdos-Renyi',
    blockGossipLatency: 0.5,
    slotDuration: 1.0
  });

  const [history, setHistory] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingResults, setFetchingResults] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/history`);
      setHistory(res.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchResults = async (id) => {
    setFetchingResults(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/${id}/result`);
      setResults(res.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setFetchingResults(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/start`, formData);
      await fetchHistory();
      setSelectedConfig(res.data);
      fetchResults(res.data.id);
    } catch (error) {
      console.error('Error starting simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (config) => {
    setSelectedConfig(config);
    fetchResults(config.id);
  };

  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} style={{ marginBottom: '6rem' }}>
        <h1>Simulate <span className="serif">the</span> Core</h1>
        <p style={{ marginTop: '1.5rem', maxWidth: '600px' }}>Orchestrate and visualize blockchain network simulations with our advanced Agent-Based Modelling engine.</p>
      </motion.div>

      <div className="grid-layout">
        <motion.div className="col-span-4 kott-card" variants={itemVariants}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuration</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Node Count</label>
              <input 
                type="number" 
                name="nodeCount" 
                className="form-control"
                value={formData.nodeCount} 
                onChange={handleInputChange} 
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Consensus Type</label>
              <select 
                name="consensusType" 
                className="form-control"
                value={formData.consensusType} 
                onChange={handleInputChange}
              >
                <option value="PoW">Proof of Work (PoW)</option>
                <option value="PoS">Proof of Stake (PoS)</option>
                <option value="DPoS">Delegated PoS (DPoS)</option>
                <option value="PoA">Proof of Authority (PoA)</option>
                <option value="PoL">Proof of Location (PoL)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Network Topology</label>
              <select 
                name="networkTopology" 
                className="form-control"
                value={formData.networkTopology} 
                onChange={handleInputChange}
              >
                <option value="Erdos-Renyi">Erdos-Renyi (Random)</option>
                <option value="Small-World">Small-World</option>
                <option value="Scale-Free">Scale-Free</option>
              </select>
            </div>

            <div className="form-group">
              <label>Block Gossip Latency (s)</label>
              <input 
                type="number" 
                name="blockGossipLatency" 
                className="form-control"
                value={formData.blockGossipLatency} 
                onChange={handleInputChange} 
                step="0.1"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Slot Duration (s)</label>
              <input 
                type="number" 
                name="slotDuration" 
                className="form-control"
                value={formData.slotDuration} 
                onChange={handleInputChange} 
                step="0.1"
                min="0.1"
              />
            </div>

            <button type="submit" className="kott-btn" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Executing...' : 'Start Simulation'}
            </button>
          </form>
        </motion.div>

        <motion.div className="col-span-8" variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="kott-card">
            <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Results</h3>
            
            {selectedConfig ? (
              <div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
                  <span className="badge">{selectedConfig.nodeCount} Nodes</span>
                  <span className="badge">{selectedConfig.consensusType}</span>
                  <span className="badge">{selectedConfig.networkTopology}</span>
                </div>

                {fetchingResults ? (
                  <p>Processing data streams...</p>
                ) : results.length > 0 ? (
                  <div>
                    {results.map((result, idx) => (
                      <div key={result.id || idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '2rem' }}>
                        <div>
                          <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1 }}>{(result.mainchainRate * 100).toFixed(1)}%</div>
                          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Mainchain Rate</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1 }}>{result.branchingRatio.toFixed(3)}</div>
                          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Branching Ratio</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1 }}>{result.finalGiniCoefficient.toFixed(3)}</div>
                          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Gini Coefficient</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1 }}>{result.durationMillis}ms</div>
                          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Duration</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Awaiting results from the core engine.</p>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Select a sequence from history or initiate a new run.</p>
            )}
          </div>

          <div className="kott-card">
            <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sequence History</h3>
            
            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleSelectHistory(item)}
                    style={{ 
                      padding: '1.5rem', 
                      border: '1px solid var(--border-color)', 
                      cursor: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderColor: selectedConfig?.id === item.id ? 'var(--accent)' : 'var(--border-color)',
                      transition: 'border-color 0.3s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '1.25rem' }}>{item.consensusType} Sequence</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>ID: {item.id.substring(0, 8)}...</div>
                    </div>
                    <span className="badge">{item.networkTopology}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No sequences registered in the current session.</p>
            )}
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}

export default Simulation;
