package com.sim.repository;

import com.sim.model.SimulationResult;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SimulationResultRepository extends MongoRepository<SimulationResult, String> {
    List<SimulationResult> findByConfigId(String configId);
}
