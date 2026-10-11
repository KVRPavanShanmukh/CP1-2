package com.sim.controller;

import com.sim.model.FriendRequest;
import com.sim.model.User;
import com.sim.service.AuthHelper;
import com.sim.service.FriendService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    @Autowired
    private FriendService friendService;

    @Autowired
    private AuthHelper authHelper;

    @GetMapping
    public ResponseEntity<?> getFriends(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        List<Map<String, Object>> friends = friendService.getFriends(userOpt.get());
        return ResponseEntity.ok(friends);
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getRequests(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        Map<String, List<FriendRequest>> map = friendService.getPendingRequests(userOpt.get());
        return ResponseEntity.ok(map);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam("query") String query, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        List<Map<String, Object>> results = friendService.searchUsers(query, userOpt.get());
        return ResponseEntity.ok(results);
    }

    @PostMapping("/request")
    public ResponseEntity<?> sendFriendRequest(@RequestBody Map<String, String> body, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        String target = body.get("target");
        if (target == null || target.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Target user identifier (ID/UID) is required."));
        }

        try {
            FriendRequest req = friendService.sendFriendRequest(userOpt.get(), target);
            return ResponseEntity.ok(Map.of("success", true, "request", req));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/requests/{id}/respond")
    public ResponseEntity<?> respondRequest(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body,
            HttpServletRequest request
    ) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        boolean accept = Boolean.TRUE.equals(body.get("accept"));
        try {
            FriendRequest updated;
            if (accept) {
                updated = friendService.acceptFriendRequest(userOpt.get(), id);
            } else {
                updated = friendService.declineFriendRequest(userOpt.get(), id);
            }
            return ResponseEntity.ok(Map.of("success", true, "request", updated));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/requests/{id}")
    public ResponseEntity<?> cancelRequest(@PathVariable String id, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        try {
            friendService.cancelFriendRequest(userOpt.get(), id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
