package com.sim.controller;

import com.sim.model.*;
import com.sim.repository.AuditLogRepository;
import com.sim.repository.UserRepository;
import com.sim.service.AuthCodeService;
import com.sim.service.UIDGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private UIDGeneratorService uidGeneratorService;
    
    @Autowired
    private AuthCodeService authCodeService;
    
    private ConcurrentHashMap<String, Integer> attempts = new ConcurrentHashMap<>();
    private ConcurrentHashMap<String, Long> lockout = new ConcurrentHashMap<>();

    private boolean isRateLimited(String ip) {
        if (lockout.containsKey(ip) && System.currentTimeMillis() < lockout.get(ip)) {
            return true;
        }
        return false;
    }
    
    private void recordAttempt(String ip) {
        attempts.put(ip, attempts.getOrDefault(ip, 0) + 1);
        if (attempts.get(ip) > 5) {
            lockout.put(ip, System.currentTimeMillis() + 60000); // 1 min
            attempts.remove(ip);
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        if (isRateLimited(ip)) return ResponseEntity.status(429).body(Map.of("error", "Rate limit exceeded"));

        String username = payload.get("username");
        String password = payload.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing fields"));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        }

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPasswordHash(passwordEncoder.encode(password));
        newUser.setAccountType(AccountType.USER);
        newUser.setRole(Role.USER);
        newUser.setUid(uidGeneratorService.generateUniqueUID(AccountType.USER));
        newUser.setActive(true);
        newUser.setCreatedAt(Instant.now());

        userRepository.save(newUser);
        auditLogRepository.save(new AuditLog("USER_REGISTERED", newUser.getId(), newUser.getId(), "Self registered"));

        return ResponseEntity.ok(Map.of("success", true, "assignedUid", newUser.getUid()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        if (isRateLimited(ip)) return ResponseEntity.status(429).body(Map.of("error", "Rate limit exceeded"));

        String username = payload.get("username");
        String password = payload.get("password");
        String uid = payload.get("uid");

        if (username == null || password == null || uid == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing fields"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            recordAttempt(ip);
            return genericAuthError();
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            recordAttempt(ip);
            return genericAuthError();
        }

        if (!uid.equals(user.getUid())) {
            recordAttempt(ip);
            return genericAuthError();
        }

        // Success
        attempts.remove(ip);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        auditLogRepository.save(new AuditLog("LOGIN_SUCCESS", user.getId(), user.getId(), ""));

        HttpSession session = request.getSession(true);
        session.setAttribute("USER_ID", user.getId());

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("user", Map.of("id", user.getId(), "username", user.getUsername(), "uid", user.getUid(), "role", user.getRole()));
        
        return ResponseEntity.ok(resp);
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_ID") != null) {
            String userId = (String) session.getAttribute("USER_ID");
            Optional<User> userOpt = userRepository.findById(userId);
            if(userOpt.isPresent()) {
                User user = userOpt.get();
                return ResponseEntity.ok(Map.of("authenticated", true, "user", Map.of("id", user.getId(), "username", user.getUsername(), "uid", user.getUid(), "role", user.getRole())));
            }
        }
        return ResponseEntity.ok(Map.of("authenticated", false));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            String userId = (String) session.getAttribute("USER_ID");
            if(userId != null) auditLogRepository.save(new AuditLog("LOGOUT", userId, userId, ""));
            session.invalidate();
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    private ResponseEntity<?> genericAuthError() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid authentication credentials."));
    }
}