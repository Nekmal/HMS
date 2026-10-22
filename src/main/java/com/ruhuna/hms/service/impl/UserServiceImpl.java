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
 * ============================================================================
 * User Accounts, Resident Allocation & Authentication Service Implementation
 * ============================================================================
 * Handles user persistence, credentials verification, role resolution, and
 * capacity-constrained room allocation.
 * 
 * ACID Room Allocation Workflow:
 * 1. Checks existence of both Student and Target Room entities.
 * 2. Enforces maximum capacity constraint (rejects if room is full).
 * 3. Safely decrements currentOccupancy in previous room (if re-allocating).
 * 4. Increments currentOccupancy in target room.
 * 5. Commits atomically under a single database transaction.
 * ============================================================================
 */
@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    /**
     * Dependency injection of UserRepository and RoomRepository.
     *
     * @param userRepository JPA repository for users.
     * @param roomRepository JPA repository for rooms.
     */
    @Autowired
    public UserServiceImpl(UserRepository userRepository, RoomRepository roomRepository) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
    }

    /**
     * Retrieves all system users across all roles (Students, Admins, Security, Cleaners, Maintenance).
     *
     * @return List of all User entities.
     */
    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Finds a user entity by its primary key database ID.
     * Throws {@link ResourceNotFoundException} if the account does not exist.
     *
     * @param id The user primary key ID.
     * @return The User entity.
     */
    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    /**
     * Persists a new user record into the database.
     *
     * @param user The incoming User entity.
     * @return The saved User entity with assigned ID.
     */
    @Override
    public User createUser(User user) {
        return userRepository.save(user);
    }

    /**
     * Atomically allocates a resident student to a designated hostel room.
     * Enforces that current occupancy does not exceed bed capacity.
     * Synchronizes old and new room occupancy counters.
     *
     * @param userId Primary key ID of the student.
     * @param roomId Primary key ID of the destination room.
     * @return The updated User entity with linked Room.
     */
    @Override
    @Transactional
    public User allocateRoom(Long userId, Long roomId) {
        User user = userRepository.findById(userId).orElse(null);
        Room room = roomRepository.findById(roomId).orElse(null);

        if (user == null || room == null) {
            throw new BadRequestException("User or Room not found");
        }

        // Enforce maximum bed capacity limit (typically 4 beds)
        if (room.getCurrentOccupancy() >= room.getCapacity()) {
            throw new BadRequestException("Room is full");
        }

        // If previously assigned to another room, decrement previous room occupancy
        Room previousRoom = user.getRoom();
        if (previousRoom != null && !previousRoom.getId().equals(room.getId())) {
            previousRoom.setCurrentOccupancy(Math.max(0, previousRoom.getCurrentOccupancy() - 1));
            roomRepository.save(previousRoom);
        }

        // Link student to new room and increment occupancy
        user.setRoom(room);
        room.setCurrentOccupancy(room.getCurrentOccupancy() + 1);

        userRepository.save(user);
        roomRepository.save(room);

        return user;
    }

    /**
     * Validates account credentials for login requests.
     * Provides role-based alias resolution for demo convenience:
     * - "security" resolves to Head of Security ("SEC001").
     * - "maintenance" resolves to Maintenance Specialist ("MNT001").
     * - "cleaning" resolves to Cleaning Supervisor ("CLN001").
     *
     * @param studentId The submitted username, staff code, or student ID.
     * @param password The submitted account password.
     * @return Authenticated User entity if valid, null otherwise.
     */
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

    /**
     * Looks up a user account by their unique student registration or staff index.
     *
     * @param studentId Unique student or staff string.
     * @return User entity or null.
     */
    @Override
    public User findByStudentId(String studentId) {
        return userRepository.findByStudentId(studentId);
    }
}

