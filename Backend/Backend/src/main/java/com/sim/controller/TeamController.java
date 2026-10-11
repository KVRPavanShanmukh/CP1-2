package com.sim.controller;

import com.sim.model.Team;
import com.sim.model.TeamInvitation;
import com.sim.model.TeamRole;
import com.sim.model.User;
import com.sim.service.AuthHelper;
import com.sim.service.TeamService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    @Autowired
    private TeamService teamService;

    @Autowired
    private AuthHelper authHelper;

    @GetMapping("/my-team")
    public ResponseEntity<?> getMyTeam(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        User user = userOpt.get();
        Optional<Team> teamOpt = teamService.getMyTeam(user);

        Map<String, Object> resp = new HashMap<>();
        if (teamOpt.isPresent()) {
            Team team = teamOpt.get();
            boolean isLeader = team.getLeaderId().equals(user.getId());
            resp.put("hasTeam", true);
            resp.put("team", team);
            resp.put("isLeader", isLeader);
            resp.put("currentUserId", user.getId());
            resp.put("currentUserUid", user.getUid());
        } else {
            resp.put("hasTeam", false);
            resp.put("team", null);
            resp.put("isLeader", false);
            resp.put("currentUserId", user.getId());
            resp.put("currentUserUid", user.getUid());
        }

        return ResponseEntity.ok(resp);
    }

    @GetMapping("/public")
    public ResponseEntity<?> listPublicTeams() {
        return ResponseEntity.ok(teamService.listPublicTeams());
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<?> getTeamById(@PathVariable String teamId) {
        Optional<Team> teamOpt = teamService.getTeamById(teamId);
        if (teamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Team not found."));
        }
        return ResponseEntity.ok(teamOpt.get());
    }

    @PostMapping
    public ResponseEntity<?> createTeam(@RequestBody Map<String, String> body, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        String name = body.get("name");
        String description = body.get("description");

        try {
            Team team = teamService.createTeam(userOpt.get(), name, description);
            return ResponseEntity.ok(Map.of("success", true, "team", team));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/validate-user")
    public ResponseEntity<?> validateUser(@RequestParam("query") String query, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        try {
            Map<String, Object> result = teamService.validateUserForTeam(query, userOpt.get());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{teamId}/members")
    public ResponseEntity<?> addMember(
            @PathVariable String teamId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        String target = body.get("target");
        if (target == null || target.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User identifier (ID/UID) is required."));
        }

        try {
            Team updatedTeam = teamService.addMemberDirectly(userOpt.get(), teamId, target);
            return ResponseEntity.ok(Map.of("success", true, "team", updatedTeam));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{teamId}/invite")
    public ResponseEntity<?> inviteMember(
            @PathVariable String teamId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        String target = body.get("target");
        try {
            TeamInvitation inv = teamService.inviteMember(userOpt.get(), teamId, target);
            return ResponseEntity.ok(Map.of("success", true, "invitation", inv));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/invitations")
    public ResponseEntity<?> getMyInvitations(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        List<TeamInvitation> list = teamService.getPendingInvitationsForUser(userOpt.get());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/invitations/{invitationId}/respond")
    public ResponseEntity<?> respondInvitation(
            @PathVariable String invitationId,
            @RequestBody Map<String, Boolean> body,
            HttpServletRequest request
    ) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        boolean accept = Boolean.TRUE.equals(body.get("accept"));
        try {
            Team team = teamService.respondToInvitation(userOpt.get(), invitationId, accept);
            return ResponseEntity.ok(Map.of("success", true, "team", team != null ? team : ""));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{teamId}/members/{targetUserId}/role")
    public ResponseEntity<?> updateMemberRole(
            @PathVariable String teamId,
            @PathVariable String targetUserId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        String roleStr = body.get("role");
        if (roleStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Role is required."));
        }

        TeamRole role;
        try {
            role = TeamRole.valueOf(roleStr.toUpperCase());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role specified: " + roleStr));
        }

        try {
            Team updated = teamService.updateMemberRole(userOpt.get(), teamId, targetUserId, role);
            return ResponseEntity.ok(Map.of("success", true, "team", updated));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{teamId}/members/{targetUserId}")
    public ResponseEntity<?> removeMember(
            @PathVariable String teamId,
            @PathVariable String targetUserId,
            HttpServletRequest request
    ) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        try {
            Team updated = teamService.removeMember(userOpt.get(), teamId, targetUserId);
            return ResponseEntity.ok(Map.of("success", true, "team", updated));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
