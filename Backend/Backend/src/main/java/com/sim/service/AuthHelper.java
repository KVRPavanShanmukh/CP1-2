package com.sim.service;

import com.sim.model.User;
import com.sim.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthHelper {

    @Autowired
    private UserRepository userRepository;

    public Optional<User> getAuthenticatedUser(HttpServletRequest request) {
        if (request == null) return Optional.empty();

        // 1. Session check
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_ID") != null) {
            String userId = (String) session.getAttribute("USER_ID");
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent() && userOpt.get().isActive()) {
                return userOpt;
            }
        }

        // 2. Header fallback check (X-User-Id)
        String headerUserId = request.getHeader("X-User-Id");
        if (headerUserId != null && !headerUserId.trim().isEmpty()) {
            Optional<User> userOpt = userRepository.findById(headerUserId.trim());
            if (userOpt.isPresent() && userOpt.get().isActive()) {
                return userOpt;
            }
        }

        // 3. Header fallback check (X-User-Uid)
        String headerUid = request.getHeader("X-User-Uid");
        if (headerUid != null && !headerUid.trim().isEmpty()) {
            Optional<User> userOpt = userRepository.findByUid(headerUid.trim());
            if (userOpt.isPresent() && userOpt.get().isActive()) {
                return userOpt;
            }
        }

        return Optional.empty();
    }
}
