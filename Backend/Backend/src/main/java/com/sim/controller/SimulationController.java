package com.sim.controller;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sim.experiment.ExperimentAggregate;
import com.sim.experiment.ExperimentComparisonRequest;
import com.sim.experiment.ExperimentComparisonRunner;
import com.sim.experiment.ExperimentRequest;
import com.sim.experiment.ExperimentRunner;
import com.sim.model.SimulationConfig;
import com.sim.model.SimulationResult;
import com.sim.model.User;
import com.sim.repository.SimulationConfigRepository;
import com.sim.repository.SimulationResultRepository;
import com.sim.service.AuthHelper;
import com.sim.service.ResearchResultsService;
import com.sim.service.SimulationOrchestratorService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/simulations")
public class SimulationController {

    private static final Logger log = LoggerFactory.getLogger(SimulationController.class);

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

    @Autowired
    private ResearchResultsService researchResultsService;

    private final ExperimentRunner experimentRunner = new ExperimentRunner();
    private final ExperimentComparisonRunner comparisonRunner =
            new ExperimentComparisonRunner(MAX_EXPERIMENT_SEEDS);

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
            // Unexpected failures (broker, persistence) are logged so a 500 is diagnosable.
            log.error("Failed to start simulation", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Simulation failed to start."));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        // Newest runs first; Mongo documents created before createdAt existed keep their
        // id ordering because the missing field sorts last with a stable secondary key.
        return ResponseEntity.ok(configRepository.findAll(Sort.by(
                Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<?> getResult(@PathVariable String id, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        List<SimulationResult> results = resultRepository.findByConfigId(id);
        if (results.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No result stored for simulation " + id + "."));
        }
        return ResponseEntity.ok(results);
    }

    /**
     * Returns one simulation together with its (optional) stored result so the history
     * view can render status and final metrics without a second round-trip.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getSimulation(@PathVariable String id, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        Optional<SimulationConfig> config = configRepository.findById(id);
        if (config.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Simulation " + id + " was not found."));
        }
        List<SimulationResult> results = resultRepository.findByConfigId(id);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("configuration", config.get());
        body.put("status", config.get().getStatus());
        body.put("result", results.isEmpty() ? null : results.get(0));
        return ResponseEntity.ok(body);
    }

    /** Lists the archived exp1-exp6 research datasets produced by the Phase 13 suite. */
    @GetMapping("/research")
    public ResponseEntity<?> listResearchExperiments(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("resultsDirectory", researchResultsService.resolveResultsDirectory()
                    .map(java.nio.file.Path::toString).orElse(null));
            body.put("experiments", researchResultsService.listExperiments());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Could not read research results: " + e.getMessage()));
        }
    }

    /** Returns one archived research dataset exactly as written by the experiment runner. */
    @GetMapping("/research/{file}")
    public ResponseEntity<?> getResearchExperiment(@PathVariable String file, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        try {
            Optional<Object> document = researchResultsService.readExperiment(file);
            if (document.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Archived experiment " + file + " was not found."));
            }
            return ResponseEntity.ok(document.get());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Could not read " + file + ": " + e.getMessage()));
        }
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

    /**
     * Runs one baseline and one or more treatments with the same ordered seeds and returns
     * per-metric deltas. Kept beside the single-configuration experiment endpoint so that
     * the existing request and response shape stays unchanged.
     */
    @PostMapping("/experiment/compare")
    public ResponseEntity<?> compareExperiment(@RequestBody ExperimentComparisonRequest comparisonRequest,
            HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        try {
            if (comparisonRequest == null || comparisonRequest.getBaseline() == null
                    || comparisonRequest.getBaseline().getConfiguration() == null) {
                throw new IllegalArgumentException("Baseline configuration is required.");
            }
            validateResourceLimits(comparisonRequest.getBaseline().getConfiguration());
            if (comparisonRequest.getTreatments() != null) {
                for (ExperimentComparisonRequest.NamedExperimentConfig treatment
                        : comparisonRequest.getTreatments()) {
                    if (treatment != null && treatment.getConfiguration() != null) {
                        validateResourceLimits(treatment.getConfiguration());
                    }
                }
            }
            return ResponseEntity.ok(comparisonRunner.run(comparisonRequest));
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

