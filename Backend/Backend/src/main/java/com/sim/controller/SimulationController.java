package com.sim.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
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
import com.sim.repository.SimulationConfigRepository;
import com.sim.repository.SimulationResultRepository;
import com.sim.service.SimulationOrchestratorService;

@RestController
@RequestMapping("/api/simulations")
@CrossOrigin(origins = "*")
public class SimulationController {

    @Autowired
    private SimulationOrchestratorService orchestratorService;

    @Autowired
    private SimulationConfigRepository configRepository;

    @Autowired
    private SimulationResultRepository resultRepository;

    private final ExperimentRunner experimentRunner = new ExperimentRunner();

    @PostMapping("/start")
    public ResponseEntity<SimulationConfig> startSimulation(@RequestBody SimulationConfig config) {
        try {
            SimulationConfig started = orchestratorService.startSimulation(config);
            return ResponseEntity.accepted().body(started);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<SimulationConfig>> getHistory() {
        return ResponseEntity.ok(configRepository.findAll());
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<List<SimulationResult>> getResult(@PathVariable String id) {
        return ResponseEntity.ok(resultRepository.findByConfigId(id));
    }

    @PostMapping("/experiment")
    public ResponseEntity<ExperimentAggregate> runExperiment(@RequestBody ExperimentRequest request) {
        try {
            if (request == null || request.getConfiguration() == null) {
                throw new IllegalArgumentException("experiment configuration is required");
            }
            return ResponseEntity.ok(experimentRunner.runRepeated(
                    request.getConfiguration(), request.getSeeds()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
