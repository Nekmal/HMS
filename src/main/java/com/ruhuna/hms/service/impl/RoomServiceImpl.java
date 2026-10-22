package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.exception.ResourceNotFoundException;
import com.ruhuna.hms.repository.RoomRepository;
import com.ruhuna.hms.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service Implementation for managing Hostel Room facilities and room assignments.
 * <p>
 * This class implements {@link RoomService} and encapsulates business logic relating to
 * room records, maximum student capacities, current occupancy, room status (e.g. AVAILABLE, FULL, UNDER_MAINTENANCE),
 * and hostel block classifications across the university campus.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
@Service
public class RoomServiceImpl implements RoomService {

    /**
     * Spring Data JPA repository for room data access operations.
     */
    private final RoomRepository roomRepository;

    /**
     * Constructs a new {@code RoomServiceImpl} with necessary repository dependencies injected.
     *
     * @param roomRepository The JPA repository for {@link Room} entities.
     */
    @Autowired
    public RoomServiceImpl(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    /**
     * Retrieves all rooms across all hostel blocks and floors in the university.
     *
     * @return A list containing all {@link Room} entities in the database.
     */
    @Override
    public List<Room> getAllRooms() {
        // Query Spring Data JPA repository to retrieve all room records
        return roomRepository.findAll();
    }

    /**
     * Retrieves a single room by its unique database identifier.
     *
     * @param id The primary key ID of the requested room.
     * @return The corresponding {@link Room} entity.
     * @throws ResourceNotFoundException if no room exists with the specified ID.
     */
    @Override
    public Room getRoomById(Long id) {
        // Lookup room entity by ID, throwing ResourceNotFoundException (HTTP 404) if absent
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
    }

    /**
     * Creates and persists a new hostel room in the system.
     * <p>
     * Initializes room capacity, current occupancy, block designation, and operational status.
     * </p>
     *
     * @param room The {@link Room} entity object containing details to be saved.
     * @return The saved {@link Room} entity with its generated database ID.
     */
    @Override
    public Room createRoom(Room room) {
        // Persist newly registered room entity into the database
        return roomRepository.save(room);
    }

    /**
     * Updates an existing room record with modified properties.
     * <p>
     * Used when modifying occupancy numbers, status flags, or capacity adjustments.
     * </p>
     *
     * @param room The {@link Room} entity containing updated field values.
     * @return The updated and persisted {@link Room} record.
     */
    @Override
    public Room updateRoom(Room room) {
        // Save and synchronize modified room details
        return roomRepository.save(room);
    }
}
