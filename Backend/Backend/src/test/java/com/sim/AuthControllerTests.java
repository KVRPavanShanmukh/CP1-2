package com.sim;

import com.sim.config.DataSeeder;
import com.sim.controller.AuthController;
import com.sim.controller.ChangePasswordController;
import com.sim.model.AuditLog;
import com.sim.model.Role;
import com.sim.model.User;
import com.sim.repository.AuditLogRepository;
import com.sim.repository.UserRepository;
import com.sim.service.AuthCodeService;
import com.sim.service.UIDGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class AuthControllerTests {

    private Map<String, User> usersById;
    private List<AuditLog> auditLogs;
    private UserRepository userRepository;
    private AuditLogRepository auditLogRepository;
    private PasswordEncoder passwordEncoder;
    private AuthController authController;
    private ChangePasswordController changePasswordController;

    @BeforeEach
    void setUp() {
        usersById = new LinkedHashMap<>();
        auditLogs = new ArrayList<>();
        passwordEncoder = new BCryptPasswordEncoder();

        userRepository = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "findByUsername": {
                            String username = (String) args[0];
                            return usersById.values().stream()
                                    .filter(u -> Objects.equals(u.getUsername(), username))
                                    .findFirst();
                        }
                        case "findById": {
                            String id = (String) args[0];
                            return Optional.ofNullable(usersById.get(id));
                        }
                        case "existsByUid": {
                            String uid = (String) args[0];
                            return usersById.values().stream().anyMatch(u -> Objects.equals(u.getUid(), uid));
                        }
                        case "save": {
                            User user = (User) args[0];
                            if (user.getId() == null) {
                                user.setId("u-" + (usersById.size() + 1));
                            }
                            usersById.put(user.getId(), user);
                            return user;
                        }
                        default:
                            throw new UnsupportedOperationException("Unexpected UserRepository method: " + method.getName());
                    }
                });

        auditLogRepository = (AuditLogRepository) Proxy.newProxyInstance(
                AuditLogRepository.class.getClassLoader(),
                new Class<?>[]{AuditLogRepository.class},
                (proxy, method, args) -> {
                    if ("save".equals(method.getName())) {
                        AuditLog log = (AuditLog) args[0];
                        auditLogs.add(log);
                        return log;
                    }
                    throw new UnsupportedOperationException("Unexpected AuditLogRepository method: " + method.getName());
                });

        UIDGeneratorService uidGeneratorService = new UIDGeneratorService();
        ReflectionTestUtils.setField(uidGeneratorService, "userRepository", userRepository);

        authController = new AuthController();
        ReflectionTestUtils.setField(authController, "userRepository", userRepository);
        ReflectionTestUtils.setField(authController, "auditLogRepository", auditLogRepository);
        ReflectionTestUtils.setField(authController, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authController, "uidGeneratorService", uidGeneratorService);
        ReflectionTestUtils.setField(authController, "authCodeService", new AuthCodeService());

        changePasswordController = new ChangePasswordController();
        ReflectionTestUtils.setField(changePasswordController, "userRepository", userRepository);
        ReflectionTestUtils.setField(changePasswordController, "passwordEncoder", passwordEncoder);
    }

    @Test
    void signupAndLoginSucceedForNewUser() {
        MockHttpServletRequest signupReq = new MockHttpServletRequest();
        ResponseEntity<?> signupRes = authController.signup(
                Map.of("username", "satwik", "password", "pass1234"), signupReq);

        assertEquals(HttpStatus.OK, signupRes.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> signupBody = (Map<String, Object>) signupRes.getBody();
        assertNotNull(signupBody);
        assertEquals(true, signupBody.get("success"));
        String uid = (String) signupBody.get("uid");
        assertNotNull(uid);
        assertTrue(uid.startsWith("UE"));

        MockHttpServletRequest loginReq = new MockHttpServletRequest();
        ResponseEntity<?> loginRes = authController.login(
                Map.of("username", "satwik", "password", "pass1234", "uid", uid), loginReq);

        assertEquals(HttpStatus.OK, loginRes.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> loginBody = (Map<String, Object>) loginRes.getBody();
        assertNotNull(loginBody);
        assertEquals(true, loginBody.get("success"));
        assertEquals(uid, loginBody.get("uid"));
        assertNotNull(loginReq.getSession(false).getAttribute("USER_ID"));
    }

    @Test
    void loginHandlesNullRoleAndSetsMustChangePassword() {
        User user = new User();
        user.setId("u1");
        user.setUsername("alice");
        user.setPasswordHash(passwordEncoder.encode("secret"));
        user.setUid("UE123456");
        user.setRole(null);
        user.setActive(true);
        user.setMustChangePassword(true);
        userRepository.save(user);

        MockHttpServletRequest req = new MockHttpServletRequest();
        ResponseEntity<?> res = authController.login(
                Map.of("username", "alice", "password", "secret"), req);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) res.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("mustChangePassword"));
        @SuppressWarnings("unchecked")
        Map<String, Object> userMap = (Map<String, Object>) body.get("user");
        assertEquals("USER", userMap.get("role"));
        assertEquals(true, userMap.get("mustChangePassword"));
        assertEquals("u1", req.getSession(false).getAttribute("USER_ID"));
    }

    @Test
    void loginRejectsInactiveUserWithForbidden() {
        User user = new User();
        user.setId("u2");
        user.setUsername("disabled");
        user.setPasswordHash(passwordEncoder.encode("secret"));
        user.setRole(Role.USER);
        user.setActive(false);
        userRepository.save(user);

        MockHttpServletRequest req = new MockHttpServletRequest();
        ResponseEntity<?> res = authController.login(
                Map.of("username", "disabled", "password", "secret"), req);

        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertNull(req.getSession(false));
    }

    @Test
    void meRejectsInactiveUser() {
        User user = new User();
        user.setId("u2");
        user.setUsername("disabled");
        user.setActive(false);
        userRepository.save(user);

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.getSession(true).setAttribute("USER_ID", "u2");

        ResponseEntity<?> res = authController.me(req);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) res.getBody();
        assertEquals(false, body.get("authenticated"));
    }

    @Test
    void changePasswordClearsMustChangePasswordFlag() {
        User user = new User();
        user.setId("u1");
        user.setUsername("owner");
        user.setPasswordHash(passwordEncoder.encode("initialPass"));
        user.setActive(true);
        user.setMustChangePassword(true);
        userRepository.save(user);

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.getSession(true).setAttribute("USER_ID", "u1");

        ResponseEntity<?> res = changePasswordController.changePassword(
                Map.of("currentPassword", "initialPass", "newPassword", "newPass123"), req);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertFalse(user.isMustChangePassword());
        assertTrue(passwordEncoder.matches("newPass123", user.getPasswordHash()));
    }

    @Test
    void dataSeederUsesNestedYamlPropertyKeysAndRejectsBlankPasswords() throws Exception {
        Field ownerPwdField = DataSeeder.class.getDeclaredField("ownerPassword");
        Field adminPwdField = DataSeeder.class.getDeclaredField("adminPassword");
        assertEquals("${app.seed.owner.password:}", ownerPwdField.getAnnotation(Value.class).value());
        assertEquals("${app.seed.admin.password:}", adminPwdField.getAnnotation(Value.class).value());

        DataSeeder seeder = new DataSeeder();
        ReflectionTestUtils.setField(seeder, "userRepository", userRepository);
        ReflectionTestUtils.setField(seeder, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(seeder, "ownerUsername", "owner");
        ReflectionTestUtils.setField(seeder, "ownerPassword", "");
        ReflectionTestUtils.setField(seeder, "adminUsername", "admin");
        ReflectionTestUtils.setField(seeder, "adminPassword", "adminPass");

        IllegalStateException ex = assertThrows(IllegalStateException.class, seeder::run);
        assertTrue(ex.getMessage().contains("SEED_OWNER_PASSWORD"));

        ReflectionTestUtils.setField(seeder, "ownerPassword", "ownerPass");
        seeder.run();
        assertTrue(userRepository.findByUsername("owner").isPresent());
        assertTrue(userRepository.findByUsername("admin").isPresent());
        assertTrue(userRepository.findByUsername("pavan").isPresent());
        assertTrue(userRepository.findByUsername("sarah").isPresent());
    }
}
