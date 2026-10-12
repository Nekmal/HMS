package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Room;
import java.util.List;

/**
 * Service interface for hostel room operations and capacity management.
 */
public interface RoomService {
    // Retrieve all hostel rooms with current occupancy
    List<Room> getAllRooms();

    // Find room by its unique database ID
    Room getRoomById(Long id);

    // Register a new room
    Room createRoom(Room room);

    // Update room details or student allocation count
    Room updateRoom(Room room);
}
