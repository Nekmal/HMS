package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.User;
import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    User getUserById(Long id);
    User createUser(User user);
    User allocateRoom(Long userId, Long roomId);
    User authenticate(String studentId, String password);
    User findByStudentId(String studentId);
}
