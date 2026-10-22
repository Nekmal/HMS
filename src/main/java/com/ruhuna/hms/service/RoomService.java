package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Room;
import java.util.List;

/**
 * Service Interface defining the contract for hostel room operations, capacities, and residential management.
 * <p>
 * Regulates room creation, block and floor classifications, student capacity allocation,
 * and real-time occupancy accounting throughout the hostel premises.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface RoomService {

    /**
     * Retrieves all rooms across all hostel blocks and floors in the university.
     *
     * @return List of all {@link Room} entities.
     */
    List<Room> getAllRooms();

    /**
     * Retrieves a single room by its unique database identifier.
     *
     * @param id The primary key ID of the requested room.
     * @return The requested {@link Room} entity.
     */
    Room getRoomById(Long id);

    /**
     * Creates and registers a new room facility in the system.
     *
     * @param room The {@link Room} entity containing room number, capacity, and block info.
     * @return The saved {@link Room} entity with its generated database ID.
     */
    Room createRoom(Room room);

    /**
     * Updates an existing room entity with modified details (occupancy, status, or capacity).
     *
     * @param room The {@link Room} entity containing modified attributes.
     * @return The persisted and updated {@link Room} record.
     */
    Room updateRoom(Room room);
}
