package com.sim.repository;

import com.sim.model.TeamInvitation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TeamInvitationRepository extends MongoRepository<TeamInvitation, String> {
    List<TeamInvitation> findByInvitedUserIdAndStatus(String invitedUserId, String status);
    List<TeamInvitation> findByTeamIdAndStatus(String teamId, String status);
    Optional<TeamInvitation> findByTeamIdAndInvitedUserIdAndStatus(String teamId, String invitedUserId, String status);
}
