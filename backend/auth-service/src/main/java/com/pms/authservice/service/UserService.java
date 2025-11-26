package com.pms.authservice.service;

import java.util.Optional;

import org.springframework.stereotype.Service;

import com.pms.authservice.model.User;
import com.pms.authservice.repository.UserRepository;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }
}
