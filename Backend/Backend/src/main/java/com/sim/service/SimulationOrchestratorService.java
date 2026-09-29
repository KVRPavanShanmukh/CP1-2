package com.sim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.config.RabbitMQConfig;
import com.sim.model.SimulationConfig;
import com.sim.repository.SimulationConfigRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SimulationOrchestratorService {

    @Autowired
    private SimulationConfigRepository configRepository;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    public SimulationConfig startSimulation(SimulationConfig config) throws JsonProcessingException {
        // Save to MongoDB
        SimulationConfig savedConfig = configRepository.save(config);
        
        // Publish job payload to RabbitMQ
        String payload = objectMapper.writeValueAsString(savedConfig);
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, "simulation.jobs.start", payload);
        
        return savedConfig;
    }
}
