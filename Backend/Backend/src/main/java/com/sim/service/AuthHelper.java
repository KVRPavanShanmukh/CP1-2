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

    /**
     * Resolves the authenticated user exclusively from the server-side session.
     * Client-supplied identity headers (X-User-Id, X-User-Uid) are intentionally
     * NOT trusted here because they can be trivially spoofed by any HTTP client.
     * Authentication is only established at login via POST /api/auth/login which
     * stores USER_ID in the server session cookie.
     */
    public Optional<User> getAuthenticatedUser(HttpServletRequest request) {
        if (request == null) return Optional.empty();

        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("USER_ID") == null) {
            return Optional.empty();
        }

        String userId = (String) session.getAttribute("USER_ID");
        return userRepository.findById(userId)
                .filter(User::isActive);
    }
}
