package com.sim.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.config.RabbitMQConfig;
import com.sim.model.SimulationConfig;
import com.sim.model.SimulationResult;
import com.sim.model.TickUpdate;
import com.sim.repository.SimulationConfigRepository;
import com.sim.repository.SimulationResultRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class RabbitMQListener {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SimulationResultRepository resultRepository;

    @Autowired
    private SimulationConfigRepository configRepository;

    @RabbitListener(queues = RabbitMQConfig.TICKS_QUEUE)
    public void handleTick(String payload) {
        try {
            TickUpdate tick = objectMapper.readValue(payload, TickUpdate.class);
            // Forward directly to WebSocket
            messagingTemplate.convertAndSend("/topic/simulation/" + tick.getSimulationId(), tick);
        } catch (Exception e) {
            System.err.println("Error processing tick: " + e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.RESULTS_QUEUE)
    public void handleResult(String payload) {
        try {
            SimulationResult result = objectMapper.readValue(payload, SimulationResult.class);
            // Save result to MongoDB
            resultRepository.save(result);
            
            // Mark config as completed
            Optional<SimulationConfig> optConfig = configRepository.findById(result.getConfigId());
            if (optConfig.isPresent()) {
                SimulationConfig config = optConfig.get();
                config.setStatus("COMPLETED");
                configRepository.save(config);
            }
            
            // Forward completion message to WS
            messagingTemplate.convertAndSend("/topic/simulation/" + result.getConfigId() + "/result", result);
        } catch (Exception e) {
            System.err.println("Error processing result: " + e.getMessage());
        }
    }
}
