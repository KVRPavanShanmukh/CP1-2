package com.sim.network;

import com.sim.engine.SimulationState;

public class NetworkModel {
    private SimulationState state;

    public NetworkModel(SimulationState state) {
        this.state = state;
    }

    public void initializeTopology() {
        // simple erdos renyi
        int n = state.getAgents().size();
        for (int i=0; i<n; i++) {
            for (int j=i+1; j<n; j++) {
                if (state.getRng().nextDouble() < 0.2) {
                    state.getAgents().get(i).addPeer(state.getAgents().get(j).getId());
                    state.getAgents().get(j).addPeer(state.getAgents().get(i).getId());
                }
            }
        }
    }

    public void deliverMessages() {
        // simulate propagation delay if we had a message queue
    }
}