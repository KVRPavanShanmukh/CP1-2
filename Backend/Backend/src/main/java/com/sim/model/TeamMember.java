package com.sim.model;

import java.time.Instant;

public class TeamMember {
    private String userId;
    private String uid;
    private String username;
    private TeamRole role;
    private String title;
    private Instant joinedAt;

    public TeamMember() {}

    public TeamMember(String userId, String uid, String username, TeamRole role, String title, Instant joinedAt) {
        this.userId = userId;
        this.uid = uid;
        this.username = username;
        this.role = role;
        this.title = title;
        this.joinedAt = joinedAt;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUid() { return uid; }
    public void setUid(String uid) { this.uid = uid; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public TeamRole getRole() { return role; }
    public void setRole(TeamRole role) { this.role = role; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
