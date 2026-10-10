package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.repository.RoomRepository;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        return userRepository.save(user);
    }

    @PutMapping("/{userId}/allocate/{roomId}")
    public ResponseEntity<?> allocateRoom(@PathVariable Long userId, @PathVariable Long roomId) {
        User user = userRepository.findById(userId).orElse(null);
        Room room = roomRepository.findById(roomId).orElse(null);

        if (user == null || room == null) {
            return ResponseEntity.badRequest().body("User or Room not found");
        }

        if (room.getCurrentOccupancy() >= room.getCapacity()) {
            return ResponseEntity.badRequest().body("Room is full");
        }

        user.setRoom(room);
        room.setCurrentOccupancy(room.getCurrentOccupancy() + 1);

        userRepository.save(user);
        roomRepository.save(room);

        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginDetails) {
        User user = userRepository.findByStudentId(loginDetails.getStudentId());
        if (user != null && user.getPassword().equals(loginDetails.getPassword())) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(401).body("Invalid credentials");
    }
}
