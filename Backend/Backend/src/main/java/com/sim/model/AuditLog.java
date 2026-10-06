package com.sim.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private String id;
    private String action;
    private String actorUserId;
    private String targetUserId;
    private String details;
    private Instant timestamp;

    public AuditLog() {}
    public AuditLog(String action, String actorUserId, String targetUserId, String details) {
        this.action = action;
        this.actorUserId = actorUserId;
        this.targetUserId = targetUserId;
        this.details = details;
        this.timestamp = Instant.now();
    }
    // Getters and Setters omitted for brevity but they are standard
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getActorUserId() { return actorUserId; }
    public void setActorUserId(String actorUserId) { this.actorUserId = actorUserId; }
    public String getTargetUserId() { return targetUserId; }
    public void setTargetUserId(String targetUserId) { this.targetUserId = targetUserId; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}