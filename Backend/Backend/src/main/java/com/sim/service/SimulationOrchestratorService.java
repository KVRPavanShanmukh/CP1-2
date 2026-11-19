package com.sim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.config.RabbitMQConfig;
import com.sim.model.SimulationConfig;
import com.sim.repository.SimulationConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SimulationOrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(SimulationOrchestratorService.class);

    @Autowired
    private SimulationConfigRepository configRepository;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    /** Spring Boot's configured mapper knows java.time types such as SimulationConfig.createdAt. */
    @Autowired
    private ObjectMapper objectMapper;

    public SimulationConfig startSimulation(SimulationConfig config) throws JsonProcessingException {
        config.validate();
        // Save to MongoDB with RUNNING status; the worker flips it to COMPLETED/FAILED.
        config.setStatus("RUNNING");
        SimulationConfig savedConfig = configRepository.save(config);

        // Publish job payload to RabbitMQ. If the broker is unavailable the run would sit
        // in RUNNING forever, so record the failure and let the controller report it.
        try {
            String payload = objectMapper.writeValueAsString(savedConfig);
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.JOBS_ROUTING_KEY, payload);
        } catch (RuntimeException publishFailure) {
            savedConfig.setStatus("FAILED");
            configRepository.save(savedConfig);
            log.error("Failed to publish simulation job {} to RabbitMQ", savedConfig.getId(), publishFailure);
            throw publishFailure;
        }

        return savedConfig;
    }
}
