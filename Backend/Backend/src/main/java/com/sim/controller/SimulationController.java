package com.sim.controller;

import com.sim.model.SimulationConfig;
import com.sim.model.SimulationResult;
import com.sim.repository.SimulationConfigRepository;
import com.sim.repository.SimulationResultRepository;
import com.sim.service.SimulationOrchestratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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

    @PostMapping("/start")
    public ResponseEntity<SimulationConfig> startSimulation(@RequestBody SimulationConfig config) {
        try {
            SimulationConfig started = orchestratorService.startSimulation(config);
            return ResponseEntity.accepted().body(started);
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
}
