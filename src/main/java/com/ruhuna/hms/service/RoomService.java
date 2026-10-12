package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Room;
import java.util.List;

public interface RoomService {
    List<Room> getAllRooms();
    Room getRoomById(Long id);
    Room createRoom(Room room);
    Room updateRoom(Room room);
}
