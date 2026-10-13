package com.sim.consensus;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;

public class PosConsensus extends ConsensusStrategy {
    @Override
    public void execute(BlockchainAgent agent, SimulationState state) {
        // 1. Attest to the current canonical head
        com.sim.blockchain.Attestation att = agent.createAttestation(state.getCurrentTick() / 10, state.getCurrentTick());
        if (att != null) {
            state.getNetworkModel().broadcastMessage(agent.getId(), com.sim.network.NetworkMessage.MessageType.ATTESTATION, att);
        }

        // 2. Block proposal
        double totalStake = state.getAgents().stream().mapToDouble(BlockchainAgent::getStake).sum();
        double prob = agent.getStake() / (totalStake + 0.1);
        if (state.getRng().nextDouble() < prob * 0.5) {
            produceBlock(agent, state);
        }
    }
}