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
        Random rand = new Random();
        int ticks = 10;
        long startTime = System.currentTimeMillis();
        
        try {
            for (int i = 1; i <= ticks; i++) {
                Thread.sleep(500); // 500ms per tick
                
                TickUpdate tick = new TickUpdate();
                tick.setSimulationId(config.getId());
                tick.setCurrentTick(i);
                tick.setActiveForks(rand.nextInt(3));
                tick.setInstantGini(0.4 + (rand.nextDouble() * 0.1));
                tick.setBlockCount(i * 5);
                
                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME, 
                    "simulation.ticks." + config.getId(), 
                    objectMapper.writeValueAsString(tick)
                );
            }
            
            // Calculate final results
            SimulationResult result = new SimulationResult();
            result.setConfigId(config.getId());
            
            // Generate some actual metrics based on the config input to simulate real behavior
            double baseMainchain = config.getConsensusType().equals("PoW") ? 0.90 : 0.95;
            double penalty = (config.getBlockGossipLatency() / 10.0);
            result.setMainchainRate(Math.max(0.4, baseMainchain - penalty));
            
            result.setBranchingRatio(0.01 + (rand.nextDouble() * 0.05) + penalty);
            result.setFinalGiniCoefficient(0.4 + (rand.nextDouble() * 0.2));
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
