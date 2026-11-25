package com.sim.controller;

import com.sim.model.User;
import com.sim.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class ChangePasswordController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, String> payload,
            HttpServletRequest request) {

        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (currentPassword == null || currentPassword.isBlank()
                || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password and new password are required."));
        }

        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("USER_ID") == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated."));
        }

        String userId = (String) session.getAttribute("USER_ID");
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found."));
        }

        User user = userOpt.get();
        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Account is deactivated."));
        }

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Current password is incorrect."));
        }

        // Prevent reusing the same password
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password must differ from the current password."));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Password changed successfully. You now have full access.",
            "mustChangePassword", false
        ));
    }
}