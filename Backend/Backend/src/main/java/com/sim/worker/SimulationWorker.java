package com.sim.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.config.RabbitMQConfig;
import com.sim.model.SimulationConfig;
import com.sim.model.SimulationResult;
import com.sim.model.TickUpdate;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class SimulationWorker {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @RabbitListener(queues = RabbitMQConfig.JOBS_QUEUE)
    public void processJob(String payload) {
        try {
            SimulationConfig config = objectMapper.readValue(payload, SimulationConfig.class);
            
            // Execute actual simulation asynchronously or inline depending on architecture
            // For now, we simulate the work in a separate thread so we don't block the listener
            new Thread(() -> runSimulation(config)).start();
            
        } catch (Exception e) {
            System.err.println("Worker failed to process job: " + e.getMessage());
        }
    }
    
    private void runSimulation(SimulationConfig config) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Give frontend time to establish WebSocket subscription
            Thread.sleep(1500);
            
            com.sim.engine.SimulationEngine engine = new com.sim.engine.SimulationEngine(config);
            int ticks = 10;
            
            for (int i = 1; i <= ticks; i++) {
                Thread.sleep((long) config.getSlotDuration() > 0 ? (long) config.getSlotDuration() : 500); // Wait slot duration or 500ms
                
                com.sim.engine.SimulationTick simTick = engine.tick();
                
                TickUpdate tick = new TickUpdate();
                tick.setSimulationId(config.getId());
                tick.setCurrentTick(i);
                tick.setActiveForks(engine.getState().getBlockchainState().getActiveForks());
                tick.setInstantGini(engine.getState().getBlockchainState().getAllBlocks().isEmpty() ? 0.0 : engine.getState().getBlockchainState().getMainchainRate()); // placeholder for UI
                tick.setBlockCount(engine.getState().getBlockchainState().getTotalBlocks());
                
                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME, 
                    "simulation.ticks." + config.getId(), 
                    objectMapper.writeValueAsString(tick)
                );
            }
            
            // Calculate final results
            SimulationResult result = new SimulationResult();
            result.setConfigId(config.getId());
            
            double mainchainRate = engine.getState().getBlockchainState().getMainchainRate();
            result.setMainchainRate(mainchainRate);
            
            // Simple branching ratio calculation
            int total = engine.getState().getBlockchainState().getTotalBlocks();
            result.setBranchingRatio(total > 0 ? (double)engine.getState().getBlockchainState().getActiveForks() / total : 0.0);
            
            // Gini
            com.sim.metrics.MetricsCalculator metrics = new com.sim.metrics.MetricsCalculator();
            metrics.calculateMetrics(engine.getState());
            result.setFinalGiniCoefficient(metrics.getCurrentGini());
            
            result.setDurationMillis(System.currentTimeMillis() - startTime);
            
            // Publish result
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME, 
                "simulation.results." + config.getId(), 
                objectMapper.writeValueAsString(result)
            );
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
