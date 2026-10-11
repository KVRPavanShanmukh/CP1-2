package com.sim.repository;

import com.sim.model.Team;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends MongoRepository<Team, String> {
    Optional<Team> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);

    @Query("{ 'status': 'ACTIVE', '$or': [ { 'leaderId': ?0 }, { 'members.userId': ?0 } ] }")
    Optional<Team> findActiveTeamByUserId(String userId);

    @Query("{ 'status': 'ACTIVE', '$or': [ { 'leaderUid': ?0 }, { 'members.uid': ?0 } ] }")
    Optional<Team> findActiveTeamByUserUid(String uid);

    List<Team> findAllByStatus(String status);
}
