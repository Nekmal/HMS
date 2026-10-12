package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.exception.ResourceNotFoundException;
import com.ruhuna.hms.repository.RoomRepository;
import com.ruhuna.hms.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service implementation for managing hostel rooms and database persistence.
 */
@Service
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;

    @Autowired
    public RoomServiceImpl(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // Fetches all hostel rooms
    @Override
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    // Fetches a specific room by its primary key ID
    @Override
    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
    }

    // Persists a newly created hostel room
    @Override
    public Room createRoom(Room room) {
        return roomRepository.save(room);
    }

    // Updates an existing room record
    @Override
    public Room updateRoom(Room room) {
        return roomRepository.save(room);
    }
}
