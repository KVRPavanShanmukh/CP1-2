package com.sim.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.config.RabbitMQConfig;
import com.sim.model.SimulationResult;
import com.sim.model.TickUpdate;
import com.sim.repository.SimulationResultRepository;
import com.sim.service.WebSocketStreamService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class RabbitMQListener {

    @Autowired
    private WebSocketStreamService webSocketStreamService;

    @Autowired
    private SimulationResultRepository resultRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @RabbitListener(queues = RabbitMQConfig.TICKS_QUEUE)
    public void receiveTickUpdate(String message) {
        try {
            TickUpdate update = objectMapper.readValue(message, TickUpdate.class);
            webSocketStreamService.streamTickUpdate(update);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @RabbitListener(queues = RabbitMQConfig.RESULTS_QUEUE)
    public void receiveSimulationResult(String message) {
        try {
            SimulationResult result = objectMapper.readValue(message, SimulationResult.class);
            resultRepository.save(result);
            System.out.println("Simulation session closed for config: " + result.getConfigId());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
