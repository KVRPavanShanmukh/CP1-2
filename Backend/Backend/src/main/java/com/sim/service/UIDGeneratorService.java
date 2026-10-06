package com.sim.service;

import com.sim.model.AccountType;
import com.sim.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class UIDGeneratorService {
    
    @Autowired
    private UserRepository userRepository;
    
    private final SecureRandom random = new SecureRandom();
    private final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public String generateUniqueUID(AccountType type) {
        String prefix = switch (type) {
            case ADMIN -> "AD";
            case DEVELOPER -> "DV";
            case USER -> "UE";
        };

        String uid;
        do {
            StringBuilder sb = new StringBuilder(prefix);
            for (int i = 0; i < 6; i++) {
                sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
            }
            uid = sb.toString();
        } while (userRepository.existsByUid(uid));
        
        return uid;
    }
}