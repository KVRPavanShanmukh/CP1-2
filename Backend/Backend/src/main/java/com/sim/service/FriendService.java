package com.sim.service;

import com.sim.model.FriendRequest;
import com.sim.model.Team;
import com.sim.model.User;
import com.sim.repository.FriendRequestRepository;
import com.sim.repository.TeamRepository;
import com.sim.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class FriendService {

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    public List<Map<String, Object>> searchUsers(String query, User caller) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String cleanQuery = query.trim();
        List<User> found = userRepository.findByUsernameContainingIgnoreCaseOrUidContainingIgnoreCase(cleanQuery, cleanQuery);

        Optional<User> byId = userRepository.findById(cleanQuery);
        if (byId.isPresent() && found.stream().noneMatch(u -> u.getId().equals(byId.get().getId()))) {
            found.add(0, byId.get());
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (User u : found) {
            if (u.getId().equals(caller.getId())) continue;

            boolean isFriend = friendRequestRepository.findAcceptedBetween(caller.getId(), u.getId()).isPresent();
            Optional<FriendRequest> pendingReq = friendRequestRepository.findPendingBetween(caller.getId(), u.getId());
            boolean isPending = pendingReq.isPresent();
            String pendingDirection = null;
            if (isPending) {
                pendingDirection = pendingReq.get().getSenderId().equals(caller.getId()) ? "OUTGOING" : "INCOMING";
            }

            Optional<Team> userTeam = teamRepository.findActiveTeamByUserId(u.getId());
            if (userTeam.isEmpty() && u.getUid() != null) {
                userTeam = teamRepository.findActiveTeamByUserUid(u.getUid());
            }
            String teamName = userTeam.map(Team::getName).orElse(null);

            Map<String, Object> item = new HashMap<>();
            item.put("id", u.getId());
            item.put("userId", u.getId());
            item.put("username", u.getUsername());
            item.put("uid", u.getUid());
            item.put("role", u.getRole());
            item.put("isFriend", isFriend);
            item.put("isPending", isPending);
            item.put("pendingDirection", pendingDirection);
            item.put("requestId", pendingReq.map(FriendRequest::getId).orElse(null));
            item.put("teamName", teamName);

            results.add(item);
        }
        return results;
    }

    public FriendRequest sendFriendRequest(User sender, String targetIdentifier) {
        if (targetIdentifier == null || targetIdentifier.trim().isEmpty()) {
            throw new IllegalArgumentException("Target user identifier cannot be empty.");
        }
        String cleanTarget = targetIdentifier.trim();

        Optional<User> targetOpt = userRepository.findById(cleanTarget);
        if (targetOpt.isEmpty()) targetOpt = userRepository.findByUid(cleanTarget);
        if (targetOpt.isEmpty()) targetOpt = userRepository.findByUsername(cleanTarget);

        if (targetOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found.");
        }

        User target = targetOpt.get();

        if (target.getId().equals(sender.getId())) {
            throw new IllegalArgumentException("You cannot send a friend request to yourself.");
        }

        if (friendRequestRepository.findAcceptedBetween(sender.getId(), target.getId()).isPresent()) {
            throw new IllegalStateException("You are already friends with this user.");
        }

        Optional<FriendRequest> existingPending = friendRequestRepository.findPendingBetween(sender.getId(), target.getId());
        if (existingPending.isPresent()) {
            if (existingPending.get().getSenderId().equals(sender.getId())) {
                throw new IllegalStateException("A friend request to this user is already pending.");
            } else {
                throw new IllegalStateException("This user has already sent you a friend request. Check your incoming requests.");
            }
        }

        FriendRequest req = new FriendRequest();
        req.setSenderId(sender.getId());
        req.setSenderUsername(sender.getUsername());
        req.setSenderUid(sender.getUid());
        req.setReceiverId(target.getId());
        req.setReceiverUsername(target.getUsername());
        req.setReceiverUid(target.getUid());
        req.setStatus("PENDING");
        req.setCreatedAt(Instant.now());

        return friendRequestRepository.save(req);
    }

    public FriendRequest acceptFriendRequest(User receiver, String requestId) {
        FriendRequest req = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found."));

        if (!req.getReceiverId().equals(receiver.getId())) {
            throw new SecurityException("You are not authorized to accept this request.");
        }

        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalStateException("Friend request is not pending.");
        }

        req.setStatus("ACCEPTED");
        req.setRespondedAt(Instant.now());
        return friendRequestRepository.save(req);
    }

    public FriendRequest declineFriendRequest(User receiver, String requestId) {
        FriendRequest req = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found."));

        if (!req.getReceiverId().equals(receiver.getId())) {
            throw new SecurityException("You are not authorized to decline this request.");
        }

        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalStateException("Friend request is not pending.");
        }

        req.setStatus("DECLINED");
        req.setRespondedAt(Instant.now());
        return friendRequestRepository.save(req);
    }

    public void cancelFriendRequest(User sender, String requestId) {
        FriendRequest req = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found."));

        if (!req.getSenderId().equals(sender.getId())) {
            throw new SecurityException("You are not authorized to cancel this request.");
        }

        friendRequestRepository.delete(req);
    }

    public List<Map<String, Object>> getFriends(User user) {
        List<FriendRequest> acceptedList = friendRequestRepository.findAllAcceptedForUser(user.getId());
        List<Map<String, Object>> friends = new ArrayList<>();

        for (FriendRequest fr : acceptedList) {
            String friendId = fr.getSenderId().equals(user.getId()) ? fr.getReceiverId() : fr.getSenderId();
            Optional<User> friendOpt = userRepository.findById(friendId);
            if (friendOpt.isPresent()) {
                User f = friendOpt.get();
                Optional<Team> teamOpt = teamRepository.findActiveTeamByUserId(f.getId());

                Map<String, Object> friendData = new HashMap<>();
                friendData.put("id", f.getId());
                friendData.put("userId", f.getId());
                friendData.put("username", f.getUsername());
                friendData.put("uid", f.getUid());
                friendData.put("role", f.getRole());
                friendData.put("teamName", teamOpt.map(Team::getName).orElse(null));
                friendData.put("teamId", teamOpt.map(Team::getId).orElse(null));
                friendData.put("friendsSince", fr.getRespondedAt() != null ? fr.getRespondedAt() : fr.getCreatedAt());

                friends.add(friendData);
            }
        }
        return friends;
    }

    public Map<String, List<FriendRequest>> getPendingRequests(User user) {
        List<FriendRequest> incoming = friendRequestRepository.findByReceiverIdAndStatus(user.getId(), "PENDING");
        List<FriendRequest> outgoing = friendRequestRepository.findBySenderIdAndStatus(user.getId(), "PENDING");

        return Map.of(
                "incoming", incoming,
                "outgoing", outgoing
        );
    }
}
