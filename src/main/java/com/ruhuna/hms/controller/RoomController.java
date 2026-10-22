package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ============================================================================
 * Hostel Rooms & Residence Allocation REST Controller
 * ============================================================================
 * Base Endpoint: /api/rooms
 * 
 * Responsibilities:
 * 1. Manages room entities distributed across the 4 residential blocks:
 *    - Block A, Block B, Block C, Block D.
 * 2. Monitors bed capacities (typically 4 beds per room) and real-time current occupancy.
 * 3. Protected by database trigger 'trg_PreventExceedRoomCapacity' ensuring current
 *    occupancy can never mathematically exceed configured bed capacity.
 * 4. Enables Sub Warden administration to inspect room occupancy rates and allocate spaces.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    /**
     * Dependency injection of RoomService.
     *
     * @param roomService Service handling room lookups, occupancy calculation, and persistence.
     */
    @Autowired
    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    /**
     * GET /api/rooms
     * Retrieves all registered hostel rooms across all four residential blocks.
     * Includes capacity, current occupancy, room number (e.g. "A-101"), and block name.
     *
     * @return List of all Room entities.
     */
    @GetMapping
    public List<Room> getAllRooms() {
        return roomService.getAllRooms();
    }

    /**
     * POST /api/rooms
     * Registers a new room into the hostel physical infrastructure directory.
     *
     * @param room JSON payload specifying roomNumber, blockName, and bed capacity.
     * @return Newly created Room entity with database ID.
     */
    @PostMapping
    public Room createRoom(@RequestBody Room room) {
        return roomService.createRoom(room);
    }
}

