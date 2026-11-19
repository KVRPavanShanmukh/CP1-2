package com.sim.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class EventTelemetry {
    private String fromId;
    private String toId;
    private String type; // "BLOCK_PROPOSAL" | "BLOCK_GOSSIP" | "ATTESTATION" | "TX_PROPAGATION" | "BYZANTINE_ATTACK" | "PACKET_DROPPED"
    private String blockId;
    private String detail;

    public EventTelemetry() {}

    public EventTelemetry(String fromId, String toId, String type, String blockId, String detail) {
        this.fromId = fromId;
        this.toId = toId;
        this.type = type;
        this.blockId = blockId;
        this.detail = detail;
    }

    public String getFromId() { return fromId; }
    public void setFromId(String fromId) { this.fromId = fromId; }

    public String getToId() { return toId; }
    public void setToId(String toId) { this.toId = toId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getBlockId() { return blockId; }
    public void setBlockId(String blockId) { this.blockId = blockId; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
}
