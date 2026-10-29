package com.sim.experiment;

import java.util.List;

import com.sim.engine.SimulationEngine;
import com.sim.model.SimulationConfig;

public class ExperimentRunner {
    public ExperimentRunResult run(SimulationConfig config) {
        config.validate();
        long startedAt = System.currentTimeMillis();
        ExperimentRunResult result = new ExperimentRunResult();
        result.setConfiguration(config);
        result.setRandomSeed(config.getRandomSeed());
        result.setConsensusType(config.getConsensusType());
        result.setSimulationTicks(config.getSimulationTicks());
        try {
            SimulationEngine engine = new SimulationEngine(config);
            for (int tick = 0; tick < config.getSimulationTicks(); tick++) {
                engine.tick();
            }
            result.setStatus("COMPLETED");
            result.setMetrics(engine.getMetricsSnapshot());
        } catch (RuntimeException exception) {
            result.setStatus("FAILED");
            result.setErrorMessage(exception.getMessage());
        } finally {
            result.setDurationMillis(System.currentTimeMillis() - startedAt);
        }
        return result;
    }

    public ExperimentAggregate runRepeated(SimulationConfig template, List<Long> seeds) {
        if (seeds == null || seeds.isEmpty()) {
            throw new IllegalArgumentException("At least one experiment seed is required");
        }
        ExperimentAggregate aggregate = new ExperimentAggregate();
        for (Long seed : seeds) {
            if (seed == null) {
                throw new IllegalArgumentException("Experiment seeds cannot be null");
            }
            SimulationConfig config = copy(template);
            config.setRandomSeed(seed);
            aggregate.addRun(run(config));
        }
        return aggregate;
    }

    private SimulationConfig copy(SimulationConfig source) {
        SimulationConfig copy = new SimulationConfig();
        copy.setNodeCount(source.getNodeCount());
        copy.setConsensusType(source.getConsensusType());
        copy.setNetworkTopology(source.getNetworkTopology());
        copy.setBlockGossipLatency(source.getBlockGossipLatency());
        copy.setSlotDuration(source.getSlotDuration());
        copy.setSimulationTicks(source.getSimulationTicks());
        copy.setByzantineRatio(source.getByzantineRatio());
        copy.setByzantineBehaviorEnabled(source.isByzantineBehaviorEnabled());
        copy.setByzantineAttackMode(source.getByzantineAttackMode());
        copy.setAuthorityIds(source.getAuthorityIds());
        copy.setRandomSeed(source.getRandomSeed());
        copy.setTransactionsPerAgentPerTick(source.getTransactionsPerAgentPerTick());
        copy.setMempoolCapacity(source.getMempoolCapacity());
        copy.setMaxTransactionsPerBlock(source.getMaxTransactionsPerBlock());
        copy.setTransactionAmount(source.getTransactionAmount());
        copy.setInactiveAgentRatio(source.getInactiveAgentRatio());
        copy.setPacketLossRate(source.getPacketLossRate());
        copy.setNetworkLatencyJitter(source.getNetworkLatencyJitter());
        copy.setPartitionRatio(source.getPartitionRatio());
        copy.setPartitionStartTick(source.getPartitionStartTick());
        copy.setPartitionEndTick(source.getPartitionEndTick());
        copy.setPartitionGroupA(source.getPartitionGroupA());
        copy.setPartitionGroupB(source.getPartitionGroupB());
        return copy;
    }
}
