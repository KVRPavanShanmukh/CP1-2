package com.sim.repository;

import com.sim.model.FriendRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends MongoRepository<FriendRequest, String> {
    List<FriendRequest> findByReceiverIdAndStatus(String receiverId, String status);
    List<FriendRequest> findBySenderIdAndStatus(String senderId, String status);

    @Query("{ 'status': 'PENDING', '$or': [ { 'senderId': ?0, 'receiverId': ?1 }, { 'senderId': ?1, 'receiverId': ?0 } ] }")
    Optional<FriendRequest> findPendingBetween(String userId1, String userId2);

    @Query("{ 'status': 'ACCEPTED', '$or': [ { 'senderId': ?0, 'receiverId': ?1 }, { 'senderId': ?1, 'receiverId': ?0 } ] }")
    Optional<FriendRequest> findAcceptedBetween(String userId1, String userId2);

    @Query("{ 'status': 'ACCEPTED', '$or': [ { 'senderId': ?0 }, { 'receiverId': ?0 } ] }")
    List<FriendRequest> findAllAcceptedForUser(String userId);
}
