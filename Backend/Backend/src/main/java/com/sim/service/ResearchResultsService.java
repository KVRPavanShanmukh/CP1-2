package com.sim.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Read-only access to the reproducible research datasets written by
 * {@code Phase13ResearchExperiments} into {@code docs/research-results/}.
 *
 * <p>The simulator itself never depends on these files; the analytics UI reads them so
 * the archived experiment results shown in the browser are exactly the JSON artefacts
 * produced by the test suite (no duplicated, hand-copied numbers).</p>
 */
@Service
public class ResearchResultsService {

    /** Only plain experiment JSON file names are served, never arbitrary paths. */
    private static final Pattern SAFE_FILE_NAME = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]*\\.json$");

    private static final Map<String, String> TITLES = new LinkedHashMap<>();

    static {
        TITLES.put("exp1-network-latency.json", "Exp 1 — Network latency vs canonical-head agreement");
        TITLES.put("exp2-packet-loss.json", "Exp 2 — Packet loss vs chain divergence");
        TITLES.put("exp3-network-partition.json", "Exp 3 — Network partitions vs convergence");
        TITLES.put("exp4-byzantine.json", "Exp 4 — Byzantine ratio vs security metrics");
        TITLES.put("exp5-tx-load.json", "Exp 5 — Transaction load vs inclusion rate");
        TITLES.put("exp6-consensus-PoS.json", "Exp 6 — PoW vs PoS");
        TITLES.put("exp6-consensus-DPoS.json", "Exp 6 — PoW vs DPoS");
        TITLES.put("exp6-consensus-PoA.json", "Exp 6 — PoW vs PoA");
        TITLES.put("exp6-consensus-PoL.json", "Exp 6 — PoW vs PoL");
    }

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${research.results-dir:}")
    private String configuredResultsDir;

    /**
     * Resolves the research-results directory. The explicit property wins; otherwise the
     * usual checkout layouts relative to the working directory are probed.
     */
    public Optional<Path> resolveResultsDirectory() {
        List<Path> candidates = new ArrayList<>();
        if (configuredResultsDir != null && !configuredResultsDir.isBlank()) {
            candidates.add(Paths.get(configuredResultsDir.trim()));
        }
        Path workingDirectory = Paths.get(System.getProperty("user.dir", ".")).toAbsolutePath().normalize();
        Path current = workingDirectory;
        for (int depth = 0; depth < 4 && current != null; depth++) {
            candidates.add(current.resolve("docs").resolve("research-results"));
            current = current.getParent();
        }
        List<Path> existing = new ArrayList<>();
        for (Path candidate : candidates) {
            Path normalized = candidate.toAbsolutePath().normalize();
            if (Files.isDirectory(normalized)) {
                existing.add(normalized);
            }
        }
        // Prefer the directory that actually contains archived experiment datasets; the
        // backend module may contain an empty docs/research-results placeholder.
        for (Path directory : existing) {
            try (var entries = Files.list(directory)) {
                boolean hasDatasets = entries.anyMatch(path -> {
                    String name = path.getFileName().toString();
                    return name.startsWith("exp") && name.endsWith(".json");
                });
                if (hasDatasets) {
                    return Optional.of(directory);
                }
            } catch (IOException ignored) {
                // Try the next candidate.
            }
        }
        return existing.isEmpty() ? Optional.empty() : Optional.of(existing.get(0));
    }

    /** @return one descriptor per archived experiment file, ordered by experiment number. */
    public List<Map<String, Object>> listExperiments() throws IOException {
        Optional<Path> directory = resolveResultsDirectory();
        if (directory.isEmpty()) {
            return List.of();
        }
        List<Path> files;
        try (var stream = Files.list(directory.get())) {
            files = stream
                    .filter(Files::isRegularFile)
                    .filter(path -> SAFE_FILE_NAME.matcher(path.getFileName().toString()).matches())
                    .filter(path -> path.getFileName().toString().startsWith("exp"))
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        }
        List<Map<String, Object>> descriptors = new ArrayList<>(files.size());
        for (Path file : files) {
            String fileName = file.getFileName().toString();
            Map<String, Object> descriptor = new LinkedHashMap<>();
            descriptor.put("file", fileName);
            descriptor.put("title", TITLES.getOrDefault(fileName, fileName));
            descriptor.put("sizeBytes", Files.size(file));
            descriptors.add(descriptor);
        }
        return descriptors;
    }

    /** Reads one archived experiment JSON document by its safe file name. */
    public Optional<Object> readExperiment(String fileName) throws IOException {
        if (fileName == null || !SAFE_FILE_NAME.matcher(fileName).matches() || !fileName.startsWith("exp")) {
            throw new IllegalArgumentException("Unsupported experiment file name.");
        }
        Optional<Path> directory = resolveResultsDirectory();
        if (directory.isEmpty()) {
            return Optional.empty();
        }
        Path file = directory.get().resolve(fileName);
        if (!Files.isRegularFile(file)) {
            return Optional.empty();
        }
        return Optional.of(objectMapper.readValue(file.toFile(), Object.class));
    }
}
