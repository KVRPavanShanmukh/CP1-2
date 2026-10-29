package com.sim.experiment;

import java.util.ArrayList;
import java.util.List;

import com.sim.model.SimulationConfig;

/**
 * Detects which conceptual configuration factors were manipulated between a baseline
 * and a treatment.
 *
 * <p>Seed, identifier and status are intentionally ignored: the comparison workflow
 * shares one ordered seed list and identifiers are not experimental variables.
 * Byzantine ratio, behavior enablement and attack mode form one conceptual Byzantine
 * factor, and every partition field forms one conceptual partition factor.</p>
 */
public final class FactorDetector {
    public static final String FACTOR_NODE_COUNT = "nodeCount";
    public static final String FACTOR_CONSENSUS_STRATEGY = "consensusType";
    public static final String FACTOR_NETWORK_TOPOLOGY = "networkTopology";
    public static final String FACTOR_BLOCK_GOSSIP_LATENCY = "blockGossipLatency";
    public static final String FACTOR_SLOT_DURATION = "slotDuration";
    public static final String FACTOR_SIMULATION_TICKS = "simulationTicks";
    public static final String FACTOR_TRANSACTION_LOAD = "transactionLoad";
    public static final String FACTOR_AUTHORITIES = "authorityIds";
    public static final String FACTOR_INACTIVE_RATIO = "inactiveAgentRatio";
    public static final String FACTOR_PACKET_LOSS = "packetLossRate";
    public static final String FACTOR_LATENCY_JITTER = "networkLatencyJitter";
    public static final String FACTOR_PARTITION = "networkPartition";
    public static final String FACTOR_BYZANTINE = "byzantineBehavior";

    private FactorDetector() {
    }

    /**
     * @return one entry per conceptual factor whose fields differ; an empty list means
     *         the two configurations are experimentally identical
     */
    public static List<FactorChange> detect(SimulationConfig baseline, SimulationConfig treatment) {
        if (baseline == null || treatment == null) {
            throw new IllegalArgumentException("Both baseline and treatment configurations are required");
        }
        List<FactorChange> changes = new ArrayList<>();
        add(changes, FACTOR_NODE_COUNT, "Node count",
                field("nodeCount", baseline.getNodeCount(), treatment.getNodeCount()));
        add(changes, FACTOR_CONSENSUS_STRATEGY, "Consensus strategy",
                field("consensusType", baseline.getConsensusType(), treatment.getConsensusType()));
        add(changes, FACTOR_NETWORK_TOPOLOGY, "Network topology",
                field("networkTopology", baseline.getNetworkTopology(), treatment.getNetworkTopology()));
        add(changes, FACTOR_BLOCK_GOSSIP_LATENCY, "Block gossip latency",
                field("blockGossipLatency", baseline.getBlockGossipLatency(), treatment.getBlockGossipLatency()));
        add(changes, FACTOR_SLOT_DURATION, "Slot duration",
                field("slotDuration", baseline.getSlotDuration(), treatment.getSlotDuration()));
        add(changes, FACTOR_SIMULATION_TICKS, "Simulation horizon",
                field("simulationTicks", baseline.getSimulationTicks(), treatment.getSimulationTicks()));
        add(changes, FACTOR_TRANSACTION_LOAD, "Transaction load",
                field("transactionsPerAgentPerTick", baseline.getTransactionsPerAgentPerTick(),
                        treatment.getTransactionsPerAgentPerTick()),
                field("mempoolCapacity", baseline.getMempoolCapacity(), treatment.getMempoolCapacity()),
                field("maxTransactionsPerBlock", baseline.getMaxTransactionsPerBlock(),
                        treatment.getMaxTransactionsPerBlock()),
                field("transactionAmount", baseline.getTransactionAmount(), treatment.getTransactionAmount()));
        add(changes, FACTOR_AUTHORITIES, "Authority set",
                field("authorityIds", baseline.getAuthorityIds(), treatment.getAuthorityIds()));
        add(changes, FACTOR_INACTIVE_RATIO, "Inactive agent ratio",
                field("inactiveAgentRatio", baseline.getInactiveAgentRatio(), treatment.getInactiveAgentRatio()));
        add(changes, FACTOR_PACKET_LOSS, "Packet loss rate",
                field("packetLossRate", baseline.getPacketLossRate(), treatment.getPacketLossRate()));
        add(changes, FACTOR_LATENCY_JITTER, "Network latency jitter",
                field("networkLatencyJitter", baseline.getNetworkLatencyJitter(),
                        treatment.getNetworkLatencyJitter()));
        add(changes, FACTOR_PARTITION, "Network partition",
                field("partitionRatio", baseline.getPartitionRatio(), treatment.getPartitionRatio()),
                field("partitionStartTick", baseline.getPartitionStartTick(), treatment.getPartitionStartTick()),
                field("partitionEndTick", baseline.getPartitionEndTick(), treatment.getPartitionEndTick()),
                field("partitionGroupA", baseline.getPartitionGroupA(), treatment.getPartitionGroupA()),
                field("partitionGroupB", baseline.getPartitionGroupB(), treatment.getPartitionGroupB()));
        add(changes, FACTOR_BYZANTINE, "Byzantine behavior",
                field("byzantineRatio", baseline.getByzantineRatio(), treatment.getByzantineRatio()),
                field("byzantineBehaviorEnabled", baseline.isByzantineBehaviorEnabled(),
                        treatment.isByzantineBehaviorEnabled()),
                field("byzantineAttackMode", baseline.getByzantineAttackMode(),
                        treatment.getByzantineAttackMode()));
        return changes;
    }

    private static FieldComparison field(String name, Object baselineValue, Object treatmentValue) {
        return new FieldComparison(name, String.valueOf(baselineValue), String.valueOf(treatmentValue));
    }

    private static void add(List<FactorChange> changes, String factor, String label,
            FieldComparison... fields) {
        List<FactorChange.FieldChange> changedFields = new ArrayList<>();
        List<String> baselineParts = new ArrayList<>();
        List<String> treatmentParts = new ArrayList<>();
        for (FieldComparison field : fields) {
            if (field.baselineValue().equals(field.treatmentValue())) {
                continue;
            }
            changedFields.add(new FactorChange.FieldChange(
                    field.field(), field.baselineValue(), field.treatmentValue()));
            baselineParts.add(field.field() + "=" + field.baselineValue());
            treatmentParts.add(field.field() + "=" + field.treatmentValue());
        }
        if (changedFields.isEmpty()) {
            return;
        }
        changes.add(new FactorChange(factor, label,
                String.join(", ", baselineParts), String.join(", ", treatmentParts), changedFields));
    }

    private record FieldComparison(String field, String baselineValue, String treatmentValue) {
    }
}
