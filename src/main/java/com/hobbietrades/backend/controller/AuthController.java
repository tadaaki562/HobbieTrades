package com.hobbietrades.backend.controller;

import com.hobbietrades.backend.model.User;
import com.hobbietrades.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();

        String email = body.get("email");
        String name = body.get("name");
        String password = body.get("password");
        String location = body.get("location");

        if (userRepository.existsByEmail(email)) {
            response.put("success", false);
            response.put("message", "Email already registered.");
            return ResponseEntity.badRequest().body(response);
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(password);
        user.setLocation(location);

        userRepository.save(user);

        response.put("success", true);
        response.put("message", "Account created successfully!");
        return ResponseEntity.ok(response);
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();

        String email = body.get("email");
        String password = body.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty() || !userOpt.get().getPassword().equals(password)) {
            response.put("success", false);
            response.put("message", "Invalid email or password.");
            return ResponseEntity.badRequest().body(response);
        }

        User user = userOpt.get();
        response.put("success", true);
        response.put("message", "Login successful!");
        response.put("token", "user-" + user.getId());
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("name", user.getName());
        userMap.put("email", user.getEmail());
        userMap.put("location", user.getLocation());
        userMap.put("rating", user.getRating());
        userMap.put("tradeCount", user.getTradeCount());
        response.put("user", userMap);

        return ResponseEntity.ok(response);
    }
}