package com.sim.controller;

import com.sim.model.Team;
import com.sim.model.User;
import com.sim.repository.TeamRepository;
import com.sim.repository.UserRepository;
import com.sim.service.AuthHelper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private AuthHelper authHelper;

    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestParam(value = "search", required = false) String search,
            HttpServletRequest request
    ) {
        Optional<User> callerOpt = authHelper.getAuthenticatedUser(request);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required. Please log in to access registered users."));
        }

        User caller = callerOpt.get();
        List<User> userList;

        if (search != null && !search.trim().isEmpty()) {
            String query = search.trim();
            userList = userRepository.findByUsernameContainingIgnoreCaseOrUidContainingIgnoreCase(query, query);
            
            // Check if search matches a persistent MongoDB ID directly
            Optional<User> byId = userRepository.findById(query);
            if (byId.isPresent() && userList.stream().noneMatch(u -> u.getId().equals(byId.get().getId()))) {
                userList.add(0, byId.get());
            }
        } else {
            userList = userRepository.findAll();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : userList) {
            if (!u.isActive()) continue;

            Optional<Team> userTeam = teamRepository.findActiveTeamByUserId(u.getId());
            if (userTeam.isEmpty() && u.getUid() != null) {
                userTeam = teamRepository.findActiveTeamByUserUid(u.getUid());
            }

            boolean alreadyInTeam = userTeam.isPresent();
            String teamName = alreadyInTeam ? userTeam.get().getName() : null;
            String teamId = alreadyInTeam ? userTeam.get().getId() : null;
            boolean isCaller = u.getId().equals(caller.getId());

            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("userId", u.getId());
            map.put("uid", u.getUid());
            map.put("username", u.getUsername());
            map.put("displayName", u.getUsername());
            map.put("role", u.getRole() != null ? u.getRole().name() : "USER");
            map.put("accountType", u.getAccountType() != null ? u.getAccountType().name() : "USER");
            map.put("createdAt", u.getCreatedAt());
            map.put("alreadyInTeam", alreadyInTeam);
            map.put("currentTeamName", teamName);
            map.put("currentTeamId", teamId);
            map.put("isSelf", isCaller);

            result.add(map);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("users", result);
        response.put("count", result.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{idOrUid}")
    public ResponseEntity<?> getUserByIdOrUid(
            @PathVariable String idOrUid,
            HttpServletRequest request
    ) {
        Optional<User> callerOpt = authHelper.getAuthenticatedUser(request);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required."));
        }

        String clean = idOrUid.trim();
        Optional<User> userOpt = userRepository.findById(clean);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUid(clean);
        }
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(clean);
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found with identifier: " + clean));
        }

        User u = userOpt.get();
        Optional<Team> userTeam = teamRepository.findActiveTeamByUserId(u.getId());
        if (userTeam.isEmpty() && u.getUid() != null) {
            userTeam = teamRepository.findActiveTeamByUserUid(u.getUid());
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", u.getId());
        map.put("userId", u.getId());
        map.put("uid", u.getUid());
        map.put("username", u.getUsername());
        map.put("displayName", u.getUsername());
        map.put("role", u.getRole() != null ? u.getRole().name() : "USER");
        map.put("accountType", u.getAccountType() != null ? u.getAccountType().name() : "USER");
        map.put("createdAt", u.getCreatedAt());
        map.put("alreadyInTeam", userTeam.isPresent());
        map.put("currentTeamName", userTeam.map(Team::getName).orElse(null));
        map.put("currentTeamId", userTeam.map(Team::getId).orElse(null));

        return ResponseEntity.ok(Map.of("user", map));
    }
}
