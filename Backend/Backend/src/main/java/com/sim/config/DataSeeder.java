package com.sim.config;

import com.sim.model.AccountType;
import com.sim.model.Role;
import com.sim.model.User;
import com.sim.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@Profile({ "dev", "seed" })
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin.username:admin}")
    private String adminUsername;

    @Value("${app.seed.admin.password:}")
    private String adminPassword;

    @Value("${app.seed.owner.username:owner}")
    private String ownerUsername;

    @Value("${app.seed.owner.password:}")
    private String ownerPassword;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("DataSeeder running in dev/seed profile — creating development users if missing.");

        if (userRepository.findByUsername(ownerUsername).isEmpty()) {
            if (ownerPassword == null || ownerPassword.isBlank()) {
                throw new IllegalStateException("SEED_OWNER_PASSWORD must be set when running the seeder");
            }
            User owner = new User();
            owner.setUsername(ownerUsername);
            owner.setPasswordHash(passwordEncoder.encode(ownerPassword));
            owner.setUid("AD000000");
            owner.setAccountType(AccountType.ADMIN);
            owner.setRole(Role.OWNER);
            owner.setActive(true);
            owner.setMustChangePassword(true);
            owner.setCreatedAt(Instant.now());
            userRepository.save(owner);
            System.out.println("Created development OWNER user (UID: AD000000). mustChangePassword=true");
        }

        if (userRepository.findByUsername(adminUsername).isEmpty()) {
            if (adminPassword == null || adminPassword.isBlank()) {
                throw new IllegalStateException("SEED_ADMIN_PASSWORD must be set when running the seeder");
            }
            User admin = new User();
            admin.setUsername(adminUsername);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setUid("AD000010");
            admin.setAccountType(AccountType.ADMIN);
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            admin.setMustChangePassword(true);
            admin.setCreatedAt(Instant.now());
            userRepository.save(admin);
            System.out.println("Created development ADMIN user (UID: AD000010). mustChangePassword=true");
        }

        if (userRepository.findByUsername("pavan").isEmpty()) {
            User pavan = new User();
            pavan.setUsername("pavan");
            pavan.setPasswordHash(passwordEncoder.encode("pavan123"));
            pavan.setUid("US000002");
            pavan.setAccountType(AccountType.USER);
            pavan.setRole(Role.USER);
            pavan.setActive(true);
            pavan.setMustChangePassword(false);
            pavan.setCreatedAt(Instant.now());
            userRepository.save(pavan);
            System.out.println("Created test user pavan (UID: US000002).");
        }

        if (userRepository.findByUsername("sarah").isEmpty()) {
            User sarah = new User();
            sarah.setUsername("sarah");
            sarah.setPasswordHash(passwordEncoder.encode("sarah123"));
            sarah.setUid("US000003");
            sarah.setAccountType(AccountType.USER);
            sarah.setRole(Role.USER);
            sarah.setActive(true);
            sarah.setMustChangePassword(false);
            sarah.setCreatedAt(Instant.now());
            userRepository.save(sarah);
            System.out.println("Created test user sarah (UID: US000003).");
        }
    }
}