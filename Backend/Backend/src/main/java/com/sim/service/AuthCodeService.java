package com.sim.service;

import com.sim.model.AuthCode;
import com.sim.repository.AuthCodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class AuthCodeService {

    @Autowired
    private AuthCodeRepository authCodeRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    private final SecureRandom random = new SecureRandom();
    private final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public String generateCode(String username, String type) {
        // Invalidate previous unused codes
        Optional<AuthCode> existing = authCodeRepository.findByTargetUsernameAndTypeAndUsedAtIsNull(username, type);
        existing.ifPresent(c -> {
            c.setUsedAt(Instant.now());
            authCodeRepository.save(c);
        });

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        String plainCode = sb.toString();

        AuthCode code = new AuthCode();
        code.setTargetUsername(username);
        code.setType(type);
        code.setCodeHash(passwordEncoder.encode(plainCode));
        code.setExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        
        authCodeRepository.save(code);
        
        // Output for dev since there's no real email service
        System.out.println("GENERATED " + type + " CODE FOR " + username + ": " + plainCode);
        return plainCode;
    }

    public boolean verifyCode(String username, String type, String plainCode) {
        Optional<AuthCode> codeOpt = authCodeRepository.findByTargetUsernameAndTypeAndUsedAtIsNull(username, type);
        if (codeOpt.isEmpty()) return false;
        
        AuthCode code = codeOpt.get();
        if (code.getExpiresAt().isBefore(Instant.now())) {
            return false;
        }
        
        code.setAttemptCount(code.getAttemptCount() + 1);
        
        if (passwordEncoder.matches(plainCode, code.getCodeHash())) {
            code.setUsedAt(Instant.now());
            authCodeRepository.save(code);
            return true;
        } else {
            authCodeRepository.save(code);
            return false;
        }
    }
}