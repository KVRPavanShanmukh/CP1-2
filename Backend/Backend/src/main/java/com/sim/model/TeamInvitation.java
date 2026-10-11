package com.sim.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "team_invitations")
public class TeamInvitation {
    @Id
    private String id;
    private String teamId;
    private String teamName;
    private String inviterId;
    private String inviterUsername;
    private String invitedUserId;
    private String invitedUsername;
    private String invitedUid;
    private String status; // "PENDING", "ACCEPTED", "DECLINED", "CANCELLED"
    private Instant createdAt;
    private Instant respondedAt;

    public TeamInvitation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public String getInviterId() { return inviterId; }
    public void setInviterId(String inviterId) { this.inviterId = inviterId; }

    public String getInviterUsername() { return inviterUsername; }
    public void setInviterUsername(String inviterUsername) { this.inviterUsername = inviterUsername; }

    public String getInvitedUserId() { return invitedUserId; }
    public void setInvitedUserId(String invitedUserId) { this.invitedUserId = invitedUserId; }

    public String getInvitedUsername() { return invitedUsername; }
    public void setInvitedUsername(String invitedUsername) { this.invitedUsername = invitedUsername; }

    public String getInvitedUid() { return invitedUid; }
    public void setInvitedUid(String invitedUid) { this.invitedUid = invitedUid; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getRespondedAt() { return respondedAt; }
    public void setRespondedAt(Instant respondedAt) { this.respondedAt = respondedAt; }
}
