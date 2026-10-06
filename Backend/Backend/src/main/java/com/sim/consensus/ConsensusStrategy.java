package com.sim.consensus;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;
import com.sim.blockchain.Block;

public abstract class ConsensusStrategy {
    public abstract void execute(BlockchainAgent agent, SimulationState state);
    
    public static ConsensusStrategy create(String type) {
        if (type == null) return new PowConsensus();
        switch (type.toUpperCase()) {
            case "POS": return new PosConsensus();
            case "DPOS": return new PowConsensus(); // placeholder
            case "POA": return new PowConsensus(); // placeholder
            case "POL": return new PowConsensus(); // placeholder
            default: return new PowConsensus();
        }
    }
}