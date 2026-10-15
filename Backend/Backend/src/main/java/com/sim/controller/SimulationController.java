package com.sim.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sim.experiment.ExperimentAggregate;
import com.sim.experiment.ExperimentRequest;
import com.sim.experiment.ExperimentRunner;
import com.sim.model.SimulationConfig;
import com.sim.model.SimulationResult;
import com.sim.model.User;
import com.sim.repository.SimulationConfigRepository;
import com.sim.repository.SimulationResultRepository;
import com.sim.service.AuthHelper;
import com.sim.service.SimulationOrchestratorService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/simulations")
public class SimulationController {

    private static final int MAX_NODE_COUNT = 1000;
    private static final int MAX_SIMULATION_TICKS = 10000;
    private static final int MAX_EXPERIMENT_SEEDS = 50;

    @Autowired
    private SimulationOrchestratorService orchestratorService;

    @Autowired
    private SimulationConfigRepository configRepository;

    @Autowired
    private SimulationResultRepository resultRepository;

    @Autowired
    private AuthHelper authHelper;

    private final ExperimentRunner experimentRunner = new ExperimentRunner();

    @PostMapping("/start")
    public ResponseEntity<?> startSimulation(@RequestBody SimulationConfig config, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        try {
            validateResourceLimits(config);
            SimulationConfig started = orchestratorService.startSimulation(config);
            return ResponseEntity.accepted().body(started);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Simulation failed to start."));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        return ResponseEntity.ok(configRepository.findAll());
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<?> getResult(@PathVariable String id, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        return ResponseEntity.ok(resultRepository.findByConfigId(id));
    }

    @PostMapping("/experiment")
    public ResponseEntity<?> runExperiment(@RequestBody ExperimentRequest experimentRequest, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        try {
            if (experimentRequest == null || experimentRequest.getConfiguration() == null) {
                throw new IllegalArgumentException("Experiment configuration is required.");
            }
            if (experimentRequest.getSeeds() != null && experimentRequest.getSeeds().size() > MAX_EXPERIMENT_SEEDS) {
                throw new IllegalArgumentException("Maximum of " + MAX_EXPERIMENT_SEEDS + " experiment seeds allowed.");
            }
            validateResourceLimits(experimentRequest.getConfiguration());
            return ResponseEntity.ok(experimentRunner.runRepeated(
                    experimentRequest.getConfiguration(), experimentRequest.getSeeds()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private void validateResourceLimits(SimulationConfig config) {
        if (config.getNodeCount() > MAX_NODE_COUNT) {
            throw new IllegalArgumentException("nodeCount must not exceed " + MAX_NODE_COUNT + ".");
        }
        if (config.getSimulationTicks() > MAX_SIMULATION_TICKS) {
            throw new IllegalArgumentException("simulationTicks must not exceed " + MAX_SIMULATION_TICKS + ".");
        }
    }
}

