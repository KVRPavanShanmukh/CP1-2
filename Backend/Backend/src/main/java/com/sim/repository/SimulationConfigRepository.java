package com.sim.repository;

import com.sim.model.SimulationConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public interface SimulationConfigRepository extends MongoRepository<SimulationConfig, String> {

    // Custom finder methods based on SimulationConfig fields
    List<SimulationConfig> findByConsensusType(String consensusType);
    
    List<SimulationConfig> findByNetworkTopology(String networkTopology);
    
    List<SimulationConfig> findByConsensusTypeAndNetworkTopology(String consensusType, String networkTopology);
}
