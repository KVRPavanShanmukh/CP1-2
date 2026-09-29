package com.sim.repository;

import com.sim.model.SimulationConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SimulationConfigRepository extends MongoRepository<SimulationConfig, String> {
    List<SimulationConfig> findByConsensusType(String consensusType);
    List<SimulationConfig> findByNetworkTopology(String networkTopology);
    List<SimulationConfig> findByConsensusTypeAndNetworkTopology(String consensusType, String networkTopology);
}
