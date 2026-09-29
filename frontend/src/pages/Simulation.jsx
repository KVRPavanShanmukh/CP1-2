import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';

const API_BASE_URL = 'http://localhost:8080/api/simulations';
const WS_URL = 'http://localhost:8080/ws-simulation';

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
  
  const [liveTicks, setLiveTicks] = useState([]);
  const stompClientRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/history`);
      setHistory(res.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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

  const connectWebSocket = (simulationId) => {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
    }
    
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = function (frame) {
      client.subscribe(`/topic/simulation/${simulationId}`, (message) => {
        const tick = JSON.parse(message.body);
        setLiveTicks((prev) => [...prev, tick]);
      });

      client.subscribe(`/topic/simulation/${simulationId}/result`, (message) => {
        const result = JSON.parse(message.body);
        setResults([result]);
        setFetchingResults(false);
        setLoading(false);
      });
    };

    client.activate();
    stompClientRef.current = client;
  };

  useEffect(() => {
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLiveTicks([]);
    setResults([]);
    try {
      const res = await axios.post(`${API_BASE_URL}/start`, formData);
      await fetchHistory();
      setSelectedConfig(res.data);
      
      connectWebSocket(res.data.id);
      setFetchingResults(true);
      
    } catch (error) {
      console.error('Error starting simulation:', error);
      setLoading(false);
    }
  };

  const handleSelectHistory = (config) => {
    setSelectedConfig(config);
    setLiveTicks([]);
    if (config.status === "COMPLETED") {
        fetchResults(config.id);
    } else {
        connectWebSocket(config.id);
        setFetchingResults(true);
    }
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
                  <div>
                      <p style={{ color: 'var(--text-secondary)' }}>Processing data streams...</p>
                      {liveTicks.length > 0 && (
                          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                  Tick {liveTicks[liveTicks.length - 1].currentTick} | Blocks: {liveTicks[liveTicks.length - 1].blockCount} | Active Forks: {liveTicks[liveTicks.length - 1].activeForks} | Gini: {liveTicks[liveTicks.length - 1].instantGini.toFixed(3)}
                              </div>
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', marginTop: '0.5rem' }}>
                                  <div style={{ 
                                      width: `${(liveTicks[liveTicks.length - 1].currentTick / 10) * 100}%`, 
                                      height: '100%', 
                                      background: 'var(--accent)',
                                      transition: 'width 0.3s ease'
                                  }}></div>
                              </div>
                          </div>
                      )}
                  </div>
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
                      cursor: 'pointer',
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
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge" style={{ background: item.status === 'RUNNING' ? 'var(--accent)' : 'transparent', color: item.status === 'RUNNING' ? '#000' : 'inherit' }}>
                            {item.status || 'UNKNOWN'}
                        </span>
                        <span className="badge">{item.networkTopology}</span>
                    </div>
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
