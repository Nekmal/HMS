package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Room;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * Room Physical Infrastructure Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements direct SQL queries without any ORM / Hibernate abstraction.
 * Enforces database trigger 'trg_PreventExceedRoomCapacity'.
 * ============================================================================
 */
@Repository
public class RoomRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public RoomRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Room> roomRowMapper = (rs, rowNum) -> {
        Room room = new Room();
        room.setId(rs.getLong("id"));
        room.setRoomNumber(rs.getString("room_number"));
        room.setBlockName(rs.getString("block_name"));
        room.setCapacity(rs.getInt("capacity"));
        room.setCurrentOccupancy(rs.getInt("current_occupancy"));
        return room;
    };

    public List<Room> findAll() {
        String sql = "SELECT id, room_number, block_name, capacity, current_occupancy FROM rooms ORDER BY room_number ASC";
        return jdbcTemplate.query(sql, roomRowMapper);
    }

    public Optional<Room> findById(Long id) {
        String sql = "SELECT id, room_number, block_name, capacity, current_occupancy FROM rooms WHERE id = ?";
        try {
            Room room = jdbcTemplate.queryForObject(sql, roomRowMapper, id);
            return Optional.ofNullable(room);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<Room> findByRoomNumber(String roomNumber) {
        String sql = "SELECT id, room_number, block_name, capacity, current_occupancy FROM rooms WHERE room_number = ?";
        try {
            Room room = jdbcTemplate.queryForObject(sql, roomRowMapper, roomNumber);
            return Optional.ofNullable(room);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Room save(Room room) {
        if (room.getId() == null) {
            String sql = "INSERT INTO rooms (room_number, block_name, capacity, current_occupancy) VALUES (?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, room.getRoomNumber());
                ps.setString(2, room.getBlockName());
                ps.setInt(3, room.getCapacity());
                ps.setInt(4, room.getCurrentOccupancy());
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                room.setId(keyHolder.getKey().longValue());
            }
            return room;
        } else {
            String sql = "UPDATE rooms SET room_number = ?, block_name = ?, capacity = ?, current_occupancy = ? WHERE id = ?";
            jdbcTemplate.update(sql, room.getRoomNumber(), room.getBlockName(), room.getCapacity(), room.getCurrentOccupancy(), room.getId());
            return room;
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM rooms WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public int count() {
        String sql = "SELECT COUNT(*) FROM rooms";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        return count != null ? count : 0;
    }
}
