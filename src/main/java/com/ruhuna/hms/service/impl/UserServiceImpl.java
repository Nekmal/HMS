package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.exception.BadRequestException;
import com.ruhuna.hms.exception.ResourceNotFoundException;
import com.ruhuna.hms.repository.RoomRepository;
import com.ruhuna.hms.repository.UserRepository;
import com.ruhuna.hms.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service implementation for managing users, room assignment integrity, and credentials authentication.
 */
@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    @Autowired
    public UserServiceImpl(UserRepository userRepository, RoomRepository roomRepository) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
    }

    // Fetches all users from the database
    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Finds a user by primary key ID or throws exception
    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    // Saves a user entity
    @Override
    public User createUser(User user) {
        return userRepository.save(user);
    }

    // Allocates a student to a room while ensuring capacity constraints (max 4 students per room)
    @Override
    @Transactional
    public User allocateRoom(Long userId, Long roomId) {
        User user = userRepository.findById(userId).orElse(null);
        Room room = roomRepository.findById(roomId).orElse(null);

        if (user == null || room == null) {
            throw new BadRequestException("User or Room not found");
        }

        if (room.getCurrentOccupancy() >= room.getCapacity()) {
            throw new BadRequestException("Room is full");
        }

        Room previousRoom = user.getRoom();
        if (previousRoom != null && !previousRoom.getId().equals(room.getId())) {
            previousRoom.setCurrentOccupancy(Math.max(0, previousRoom.getCurrentOccupancy() - 1));
            roomRepository.save(previousRoom);
        }

        user.setRoom(room);
        room.setCurrentOccupancy(room.getCurrentOccupancy() + 1);

        userRepository.save(user);
        roomRepository.save(room);

        return user;
    }

    // Authenticates user with credentials
    @Override
    public User authenticate(String studentId, String password) {
        User user = userRepository.findByStudentId(studentId);
        if (user == null && studentId != null) {
            String lower = studentId.trim().toLowerCase();
            if ("security".equals(lower)) {
                user = userRepository.findByStudentId("SEC001");
            } else if ("maintenance".equals(lower)) {
                user = userRepository.findByStudentId("MNT001");
            } else if ("cleaning".equals(lower)) {
                user = userRepository.findByStudentId("CLN001");
            }
        }
        if (user != null && user.getPassword() != null && user.getPassword().equals(password)) {
            return user;
        }
        return null;
    }

    // Finds a user by their student/staff ID
    @Override
    public User findByStudentId(String studentId) {
        return userRepository.findByStudentId(studentId);
    }
}
