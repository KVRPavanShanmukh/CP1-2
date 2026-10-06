package com.sim.repository;
import com.sim.model.AuthCode;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface AuthCodeRepository extends MongoRepository<AuthCode, String> {
    Optional<AuthCode> findByTargetUsernameAndTypeAndUsedAtIsNull(String targetUsername, String type);
}