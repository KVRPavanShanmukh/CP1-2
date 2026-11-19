package com.sim.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class NodeTelemetry {
    private String id;
    private String role; // "HONEST" | "BYZANTINE" | "INACTIVE"
    private int partitionId;
    private double stake;
    private double hashPower;
    private String headBlockId;
    private int mempoolSize;
    private String currentAction; // "PROPOSING" | "ATTESTING" | "VALIDATING" | "GOSSIPING" | "EQUIVOCATING" | "WITHHOLDING" | "IDLE"
    private boolean isProposer;
    private List<String> peers;

    public NodeTelemetry() {}

    public NodeTelemetry(String id, String role, int partitionId, double stake, double hashPower,
                         String headBlockId, int mempoolSize, String currentAction,
                         boolean isProposer, List<String> peers) {
        this.id = id;
        this.role = role;
        this.partitionId = partitionId;
        this.stake = stake;
        this.hashPower = hashPower;
        this.headBlockId = headBlockId;
        this.mempoolSize = mempoolSize;
        this.currentAction = currentAction;
        this.isProposer = isProposer;
        this.peers = peers;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public int getPartitionId() { return partitionId; }
    public void setPartitionId(int partitionId) { this.partitionId = partitionId; }

    public double getStake() { return stake; }
    public void setStake(double stake) { this.stake = stake; }

    public double getHashPower() { return hashPower; }
    public void setHashPower(double hashPower) { this.hashPower = hashPower; }

    public String getHeadBlockId() { return headBlockId; }
    public void setHeadBlockId(String headBlockId) { this.headBlockId = headBlockId; }

    public int getMempoolSize() { return mempoolSize; }
    public void setMempoolSize(int mempoolSize) { this.mempoolSize = mempoolSize; }

    public String getCurrentAction() { return currentAction; }
    public void setCurrentAction(String currentAction) { this.currentAction = currentAction; }

    public boolean isProposer() { return isProposer; }
    public void setProposer(boolean proposer) { isProposer = proposer; }

    public List<String> getPeers() { return peers; }
    public void setPeers(List<String> peers) { this.peers = peers; }
}
