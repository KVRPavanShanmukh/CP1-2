package com.sim.config;

import com.sim.model.AccountType;
import com.sim.model.Role;
import com.sim.model.User;
import com.sim.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("⚠ WARNING: DataSeeder uses hardcoded development passwords. Change passwords after first login in a shared or production environment.");

        if (userRepository.findByUsername("owner").isEmpty()) {
            User owner = new User();
            owner.setUsername("owner");
            owner.setPasswordHash(passwordEncoder.encode("chain55")); // Development only
            owner.setUid("AD000000"); // Hardcoded strict owner UID for dev
            owner.setAccountType(AccountType.ADMIN);
            owner.setRole(Role.OWNER);
            owner.setActive(true);
            owner.setCreatedAt(Instant.now());
            userRepository.save(owner);
            System.out.println("Created development OWNER user (UID: AD000000).");
        }

        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin")); // Dev default
            admin.setUid("AD000010");
            admin.setAccountType(AccountType.ADMIN);
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            admin.setCreatedAt(Instant.now());
            userRepository.save(admin);
            System.out.println("Created development ADMIN user (UID: AD000010).");
        } else {
            // Update existing admin UID and password if needed for development
            User existingAdmin = userRepository.findByUsername("admin").get();
            boolean updated = false;
            if (!"AD000010".equals(existingAdmin.getUid())) {
                existingAdmin.setUid("AD000010");
                updated = true;
            }
            if (!passwordEncoder.matches("admin", existingAdmin.getPasswordHash())) {
                existingAdmin.setPasswordHash(passwordEncoder.encode("admin"));
                updated = true;
            }
            if (!existingAdmin.isActive()) {
                existingAdmin.setActive(true);
                updated = true;
            }
            if (updated) {
                userRepository.save(existingAdmin);
                System.out.println("Updated development ADMIN user (UID: AD000010).");
            } else {
                System.out.println("Development ADMIN user already exists — password NOT reset.");
            }
        }

        if (userRepository.findByUsername("pavan").isEmpty()) {
            User pavan = new User();
            pavan.setUsername("pavan");
            pavan.setPasswordHash(passwordEncoder.encode("pavan123"));
            pavan.setUid("US000002");
            pavan.setAccountType(AccountType.USER);
            pavan.setRole(Role.USER);
            pavan.setActive(true);
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
            sarah.setCreatedAt(Instant.now());
            userRepository.save(sarah);
            System.out.println("Created test user sarah (UID: US000003).");
        }
    }
}