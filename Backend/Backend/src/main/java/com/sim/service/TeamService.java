package com.sim.service;

import com.sim.model.*;
import com.sim.repository.TeamInvitationRepository;
import com.sim.repository.TeamRepository;
import com.sim.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class TeamService {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamInvitationRepository teamInvitationRepository;

    @Autowired
    private UserRepository userRepository;

    public Team createTeam(User leader, String name, String description) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Team name cannot be empty.");
        }
        String cleanName = name.trim();

        // Check if user already in an active team
        Optional<Team> existingTeam = teamRepository.findActiveTeamByUserId(leader.getId());
        if (existingTeam.isPresent()) {
            throw new IllegalStateException("You are already part of an active team: " + existingTeam.get().getName());
        }

        if (teamRepository.existsByNameIgnoreCase(cleanName)) {
            throw new IllegalArgumentException("A team with this name already exists.");
        }

        Team team = new Team();
        team.setName(cleanName);
        team.setDescription(description != null ? description.trim() : "");
        team.setLeaderId(leader.getId());
        team.setLeaderUid(leader.getUid());
        team.setLeaderUsername(leader.getUsername());
        team.setStatus("ACTIVE");
        team.setCreatedAt(Instant.now());
        team.setUpdatedAt(Instant.now());

        TeamMember leaderMember = new TeamMember(
                leader.getId(),
                leader.getUid(),
                leader.getUsername(),
                TeamRole.LEADER,
                "TEAM LEADER",
                Instant.now()
        );
        team.getMembers().add(leaderMember);

        return teamRepository.save(team);
    }

    public Optional<Team> getMyTeam(User user) {
        Optional<Team> byId = teamRepository.findActiveTeamByUserId(user.getId());
        if (byId.isPresent()) return byId;
        return teamRepository.findActiveTeamByUserUid(user.getUid());
    }

    public Optional<Team> getTeamById(String teamId) {
        return teamRepository.findById(teamId);
    }

    public List<Team> listPublicTeams() {
        return teamRepository.findAllByStatus("ACTIVE");
    }

    public Map<String, Object> validateUserForTeam(String query, User caller) {
        if (query == null || query.trim().isEmpty()) {
            throw new IllegalArgumentException("Search query cannot be empty.");
        }
        String cleanQuery = query.trim();

        Optional<User> targetOpt = userRepository.findByUid(cleanQuery);
        if (targetOpt.isEmpty()) {
            targetOpt = userRepository.findByUsername(cleanQuery);
        }
        if (targetOpt.isEmpty()) {
            targetOpt = userRepository.findById(cleanQuery);
        }

        if (targetOpt.isEmpty()) {
            return Map.of("exists", false, "message", "User not found with ID/UID: " + cleanQuery);
        }

        User target = targetOpt.get();
        boolean isSelf = target.getId().equals(caller.getId());

        Optional<Team> activeTeamOpt = teamRepository.findActiveTeamByUserId(target.getId());
        boolean alreadyInTeam = activeTeamOpt.isPresent();
        String currentTeamName = alreadyInTeam ? activeTeamOpt.get().getName() : null;
        String currentTeamId = alreadyInTeam ? activeTeamOpt.get().getId() : null;

        Map<String, Object> resp = new HashMap<>();
        resp.put("exists", true);
        resp.put("user", Map.of(
                "id", target.getId(),
                "username", target.getUsername(),
                "uid", target.getUid(),
                "role", target.getRole()
        ));
        resp.put("alreadyInTeam", alreadyInTeam);
        resp.put("currentTeamName", currentTeamName);
        resp.put("currentTeamId", currentTeamId);
        resp.put("isSelf", isSelf);

        return resp;
    }

    public Team addMemberDirectly(User caller, String teamId, String targetIdentifier) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        if (!"ACTIVE".equals(team.getStatus())) {
            throw new IllegalStateException("Team is not active.");
        }

        // Only Team Leader can directly add members
        if (!team.getLeaderId().equals(caller.getId())) {
            throw new SecurityException("Only the Team Leader can add members directly.");
        }

        Optional<User> targetOpt = userRepository.findByUid(targetIdentifier.trim());
        if (targetOpt.isEmpty()) targetOpt = userRepository.findByUsername(targetIdentifier.trim());
        if (targetOpt.isEmpty()) targetOpt = userRepository.findById(targetIdentifier.trim());

        if (targetOpt.isEmpty()) {
            throw new IllegalArgumentException("Target user not found.");
        }

        User target = targetOpt.get();

        // Enforce maximum team capacity of 4 members
        if (team.getMembers().size() >= 4) {
            throw new IllegalStateException("Team is already at maximum capacity (4/4 members).");
        }

        // Check if already in this team
        boolean alreadyInThisTeam = team.getMembers().stream()
                .anyMatch(m -> m.getUserId().equals(target.getId()) || (target.getUid() != null && target.getUid().equals(m.getUid())));
        if (alreadyInThisTeam) {
            throw new IllegalStateException("User is already a member of this team.");
        }

        // Check if in another team
        Optional<Team> otherTeam = teamRepository.findActiveTeamByUserId(target.getId());
        if (otherTeam.isPresent()) {
            throw new IllegalStateException("User is already an active member of another team: " + otherTeam.get().getName());
        }

        TeamMember newMember = new TeamMember(
                target.getId(),
                target.getUid(),
                target.getUsername(),
                TeamRole.MEMBER,
                "MEMBER",
                Instant.now()
        );

        team.getMembers().add(newMember);
        team.setUpdatedAt(Instant.now());

        // Cancel any pending invitations
        List<TeamInvitation> pending = teamInvitationRepository.findByInvitedUserIdAndStatus(target.getId(), "PENDING");
        for (TeamInvitation inv : pending) {
            if (inv.getTeamId().equals(team.getId())) {
                inv.setStatus("ACCEPTED");
                inv.setRespondedAt(Instant.now());
                teamInvitationRepository.save(inv);
            }
        }

        return teamRepository.save(team);
    }

    public TeamInvitation inviteMember(User caller, String teamId, String targetIdentifier) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        // Only Leader or Admin can invite
        boolean isAuthorized = team.getLeaderId().equals(caller.getId()) ||
                team.getMembers().stream().anyMatch(m -> m.getUserId().equals(caller.getId()) && m.getRole() == TeamRole.ADMIN);
        if (!isAuthorized) {
            throw new SecurityException("You do not have permission to invite members.");
        }

        if (team.getMembers().size() >= 4) {
            throw new IllegalStateException("Team is already at maximum capacity (4/4 members).");
        }


        Optional<User> targetOpt = userRepository.findByUid(targetIdentifier.trim());
        if (targetOpt.isEmpty()) targetOpt = userRepository.findByUsername(targetIdentifier.trim());
        if (targetOpt.isEmpty()) targetOpt = userRepository.findById(targetIdentifier.trim());

        if (targetOpt.isEmpty()) {
            throw new IllegalArgumentException("Target user not found.");
        }

        User target = targetOpt.get();

        if (target.getId().equals(caller.getId())) {
            throw new IllegalArgumentException("You cannot invite yourself.");
        }

        boolean alreadyInThisTeam = team.getMembers().stream()
                .anyMatch(m -> m.getUserId().equals(target.getId()));
        if (alreadyInThisTeam) {
            throw new IllegalStateException("User is already in this team.");
        }

        Optional<Team> otherTeam = teamRepository.findActiveTeamByUserId(target.getId());
        if (otherTeam.isPresent()) {
            throw new IllegalStateException("User is already a member of team: " + otherTeam.get().getName());
        }

        Optional<TeamInvitation> existingInv = teamInvitationRepository
                .findByTeamIdAndInvitedUserIdAndStatus(team.getId(), target.getId(), "PENDING");
        if (existingInv.isPresent()) {
            throw new IllegalStateException("An invitation is already pending for this user.");
        }

        TeamInvitation invitation = new TeamInvitation();
        invitation.setTeamId(team.getId());
        invitation.setTeamName(team.getName());
        invitation.setInviterId(caller.getId());
        invitation.setInviterUsername(caller.getUsername());
        invitation.setInvitedUserId(target.getId());
        invitation.setInvitedUsername(target.getUsername());
        invitation.setInvitedUid(target.getUid());
        invitation.setStatus("PENDING");
        invitation.setCreatedAt(Instant.now());

        return teamInvitationRepository.save(invitation);
    }

    public List<TeamInvitation> getPendingInvitationsForUser(User user) {
        return teamInvitationRepository.findByInvitedUserIdAndStatus(user.getId(), "PENDING");
    }

    public Team respondToInvitation(User user, String invitationId, boolean accept) {
        TeamInvitation invitation = teamInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found."));

        if (!invitation.getInvitedUserId().equals(user.getId())) {
            throw new SecurityException("You are not authorized to respond to this invitation.");
        }

        if (!"PENDING".equals(invitation.getStatus())) {
            throw new IllegalStateException("Invitation is no longer pending.");
        }

        if (!accept) {
            invitation.setStatus("DECLINED");
            invitation.setRespondedAt(Instant.now());
            teamInvitationRepository.save(invitation);
            return null;
        }

        // Accept
        Optional<Team> currentTeam = teamRepository.findActiveTeamByUserId(user.getId());
        if (currentTeam.isPresent()) {
            throw new IllegalStateException("You are already a member of team: " + currentTeam.get().getName());
        }

        Team team = teamRepository.findById(invitation.getTeamId())
                .orElseThrow(() -> new IllegalArgumentException("Target team no longer exists."));

        if (team.getMembers().size() >= 4) {
            throw new IllegalStateException("Team is already at maximum capacity (4/4 members).");
        }


        TeamMember member = new TeamMember(
                user.getId(),
                user.getUid(),
                user.getUsername(),
                TeamRole.MEMBER,
                "MEMBER",
                Instant.now()
        );
        team.getMembers().add(member);
        team.setUpdatedAt(Instant.now());

        invitation.setStatus("ACCEPTED");
        invitation.setRespondedAt(Instant.now());
        teamInvitationRepository.save(invitation);

        return teamRepository.save(team);
    }

    public Team updateMemberRole(User caller, String teamId, String targetUserId, TeamRole newRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        // Only Team Leader can update roles
        if (!team.getLeaderId().equals(caller.getId())) {
            throw new SecurityException("Only the Team Leader can update member roles.");
        }

        if (targetUserId.equals(team.getLeaderId())) {
            throw new IllegalArgumentException("Cannot change the Team Leader's role.");
        }

        if (newRole == TeamRole.LEADER) {
            throw new IllegalArgumentException("Use ownership transfer to designate a new Team Leader.");
        }

        boolean found = false;
        for (TeamMember m : team.getMembers()) {
            if (m.getUserId().equals(targetUserId)) {
                m.setRole(newRole);
                m.setTitle(newRole.name());
                found = true;
                break;
            }
        }

        if (!found) {
            throw new IllegalArgumentException("Member not found in this team.");
        }

        team.setUpdatedAt(Instant.now());
        return teamRepository.save(team);
    }

    public Team removeMember(User caller, String teamId, String targetUserId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        boolean isLeader = team.getLeaderId().equals(caller.getId());
        boolean isSelf = caller.getId().equals(targetUserId);

        if (!isLeader && !isSelf) {
            throw new SecurityException("Only the Team Leader or the member themselves can perform removal.");
        }

        if (targetUserId.equals(team.getLeaderId())) {
            throw new IllegalArgumentException("The Team Leader cannot be removed from the team.");
        }

        boolean removed = team.getMembers().removeIf(m -> m.getUserId().equals(targetUserId));
        if (!removed) {
            throw new IllegalArgumentException("Member not found in team.");
        }

        team.setUpdatedAt(Instant.now());
        return teamRepository.save(team);
    }
}
