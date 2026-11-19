package com.sim;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.config.JacksonConfig;
import com.sim.model.SimulationConfig;
import com.sim.worker.SimulationWorker;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

/**
 * Verifies that the RabbitMQ worker executes the real, configured SimulationEngine and
 * publishes one tick per configured tick plus one final result — not a fixed stub.
 */
class SimulationWorkerTests {

    @Test
    void workerExecutesConfiguredEngineAndPublishesTicksAndResult() throws Exception {
        CapturingRabbitTemplate rabbit = new CapturingRabbitTemplate();
        ObjectMapper mapper = new JacksonConfig().objectMapper();
        SimulationWorker worker = new SimulationWorker(rabbit, mapper);

        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(3);
        config.setConsensusType("PoW");
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(0.5);
        config.setSlotDuration(0.0); // floor is 50 ms per tick, keeps the test quick
        config.setSimulationTicks(2);
        config.setRandomSeed(5L);
        config.setByzantineRatio(0.0);
        config.setInactiveAgentRatio(0.0);
        config.setPacketLossRate(0.0);
        config.setNetworkLatencyJitter(2);

        worker.processJob(mapper.writeValueAsString(config));

        List<Object> ticks = rabbit.messagesWithRoutingPrefix("simulation.ticks.");
        List<Object> results = rabbit.messagesWithRoutingPrefix("simulation.results.");

        assertEquals(2, ticks.size(), "one tick message per configured simulation tick");
        assertEquals(1, results.size(), "exactly one final result per run");

        JsonNode firstTick = mapper.readTree((String) ticks.get(0));
        assertEquals(config.getId(), firstTick.get("simulationId").asText());
        assertEquals(1, firstTick.get("currentTick").asInt());
        assertEquals(2, firstTick.get("totalTicks").asInt());
        assertTrue(firstTick.get("progress").asDouble() > 0.0);
        assertNotNull(firstTick.get("metrics").get("mainchainRate"));
        assertNotNull(firstTick.get("metrics").get("branchingRatio"));

        JsonNode result = mapper.readTree((String) results.get(0));
        assertEquals("COMPLETED", result.get("status").asText());
        assertEquals(config.getId(), result.get("configId").asText());
        assertEquals(2, result.get("simulationTicks").asInt());
        assertTrue(result.get("mainchainRate").asDouble() >= 0.0
                && result.get("mainchainRate").asDouble() <= 1.0);
        assertTrue(result.get("branchingRatio").asDouble() >= 0.0);
        assertNotNull(result.get("metrics").get("giniCoefficient"));
    }

    /** RabbitTemplate stub that records the serialized payloads instead of using a broker. */
    private static final class CapturingRabbitTemplate extends RabbitTemplate {
        private final Map<String, List<Object>> messages = new LinkedHashMap<>();

        @Override
        public void convertAndSend(String exchange, String routingKey, Object object) {
            messages.computeIfAbsent(routingKey, key -> new ArrayList<>()).add(object);
        }

        List<Object> messagesWithRoutingPrefix(String prefix) {
            return messages.entrySet().stream()
                    .filter(entry -> entry.getKey().startsWith(prefix))
                    .flatMap(entry -> entry.getValue().stream())
                    .toList();
        }
    }
}
