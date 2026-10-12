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

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    @Autowired
    public UserServiceImpl(UserRepository userRepository, RoomRepository roomRepository) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
    }

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Override
    public User createUser(User user) {
        return userRepository.save(user);
    }

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

        user.setRoom(room);
        room.setCurrentOccupancy(room.getCurrentOccupancy() + 1);

        userRepository.save(user);
        roomRepository.save(room);

        return user;
    }

    @Override
    public User authenticate(String studentId, String password) {
        User user = userRepository.findByStudentId(studentId);
        if (user != null && user.getPassword() != null && user.getPassword().equals(password)) {
            return user;
        }
        return null;
    }

    @Override
    public User findByStudentId(String studentId) {
        return userRepository.findByStudentId(studentId);
    }
}
