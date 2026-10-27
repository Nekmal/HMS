package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Inventory;
import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.entity.RoomInventory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * Room Equipment Damage & Asset Maintenance Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements pure parameterized SQL queries and invokes Stored Procedures:
 * - 'sp_ReportRoomDamage' (Multi-table room damage report and warehouse balance)
 * - 'sp_CompleteRoomRepair' (Restores stock and auto-resolves student complaints)
 * - 'vw_RoomDamagesTracker' (Analytical repair tracking view)
 * ============================================================================
 */
@Repository
public class RoomInventoryRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public RoomInventoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<RoomInventory> roomInventoryRowMapper = (rs, rowNum) -> {
        RoomInventory ri = new RoomInventory();
        ri.setId(rs.getLong("id"));
        ri.setBrokenQuantity(rs.getInt("broken_quantity"));
        ri.setDamageDescription(rs.getString("damage_description"));
        ri.setStatus(rs.getString("status"));

        Date rDate = rs.getDate("reported_date");
        if (rDate != null) {
            ri.setReportedDate(rDate.toLocalDate());
        }

        Room room = new Room();
        room.setId(rs.getLong("room_id"));
        room.setRoomNumber(rs.getString("room_number"));
        room.setBlockName(rs.getString("block_name"));
        room.setCapacity(rs.getInt("capacity"));
        room.setCurrentOccupancy(rs.getInt("current_occupancy"));
        ri.setRoom(room);

        Inventory inv = new Inventory();
        inv.setId(rs.getLong("inventory_id"));
        inv.setItemName(rs.getString("item_name"));
        inv.setTotalQuantity(rs.getInt("total_quantity"));
        inv.setAvailableQuantity(rs.getInt("available_quantity"));
        inv.setBrokenQuantity(rs.getInt("inv_broken_quantity"));
        inv.setCategory(rs.getString("category"));
        ri.setInventory(inv);

        return ri;
    };

    private static final String BASE_SELECT =
            "SELECT ri.id, ri.room_id, ri.inventory_id, ri.broken_quantity, ri.damage_description, ri.status, ri.reported_date, " +
            "       r.room_number, r.block_name, r.capacity, r.current_occupancy, " +
            "       inv.item_name, inv.total_quantity, inv.available_quantity, inv.broken_quantity AS inv_broken_quantity, inv.category " +
            "FROM room_inventory ri " +
            "JOIN rooms r ON ri.room_id = r.id " +
            "JOIN inventory inv ON ri.inventory_id = inv.id ";

    public List<RoomInventory> findAll() {
        String sql = BASE_SELECT + "ORDER BY ri.id DESC";
        return jdbcTemplate.query(sql, roomInventoryRowMapper);
    }

    public Optional<RoomInventory> findById(Long id) {
        String sql = BASE_SELECT + "WHERE ri.id = ?";
        try {
            RoomInventory ri = jdbcTemplate.queryForObject(sql, roomInventoryRowMapper, id);
            return Optional.ofNullable(ri);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<RoomInventory> findByRoomId(Long roomId) {
        String sql = BASE_SELECT + "WHERE ri.room_id = ? ORDER BY ri.id DESC";
        return jdbcTemplate.query(sql, roomInventoryRowMapper, roomId);
    }

    public List<RoomInventory> findByStatus(String status) {
        String sql = BASE_SELECT + "WHERE ri.status = ? ORDER BY ri.id DESC";
        return jdbcTemplate.query(sql, roomInventoryRowMapper, status);
    }

    public RoomInventory save(RoomInventory ri) {
        Long roomId = (ri.getRoom() != null) ? ri.getRoom().getId() : null;
        Long invId = (ri.getInventory() != null) ? ri.getInventory().getId() : null;
        Date rDate = (ri.getReportedDate() != null) ? Date.valueOf(ri.getReportedDate()) : Date.valueOf(java.time.LocalDate.now());

        if (ri.getId() == null) {
            String sql = "INSERT INTO room_inventory (room_id, inventory_id, broken_quantity, damage_description, status, reported_date) " +
                         "VALUES (?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                if (roomId != null) {
                    ps.setLong(1, roomId);
                } else {
                    ps.setNull(1, Types.BIGINT);
                }
                if (invId != null) {
                    ps.setLong(2, invId);
                } else {
                    ps.setNull(2, Types.BIGINT);
                }
                ps.setInt(3, ri.getBrokenQuantity());
                ps.setString(4, ri.getDamageDescription());
                ps.setString(5, ri.getStatus() != null ? ri.getStatus() : "BROKEN");
                ps.setDate(6, rDate);
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                ri.setId(keyHolder.getKey().longValue());
            }
            return ri;
        } else {
            String sql = "UPDATE room_inventory SET room_id = ?, inventory_id = ?, broken_quantity = ?, damage_description = ?, status = ?, reported_date = ? " +
                         "WHERE id = ?";
            jdbcTemplate.update(sql,
                    roomId,
                    invId,
                    ri.getBrokenQuantity(),
                    ri.getDamageDescription(),
                    ri.getStatus(),
                    rDate,
                    ri.getId()
            );
            return ri;
        }
    }

    public void delete(RoomInventory damage) {
        if (damage != null && damage.getId() != null) {
            deleteById(damage.getId());
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM room_inventory WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_ReportRoomDamage' with multi-table ACID transaction.
     *
     * @param roomNumber Room code identifier (e.g. "A-101").
     * @param itemName Warehouse catalog asset name.
     * @param brokenQty Number of defective units.
     * @param description Defect description.
     * @return Created damage record ID.
     */
    public Long callReportRoomDamageProcedure(String roomNumber, String itemName, int brokenQty, String description) {
        return jdbcTemplate.execute("{CALL sp_ReportRoomDamage(?, ?, ?, ?, ?)}", (CallableStatementCallback<Long>) cs -> {
            cs.setString(1, roomNumber);
            cs.setString(2, itemName);
            cs.setInt(3, brokenQty);
            cs.setString(4, description);
            cs.registerOutParameter(5, Types.BIGINT);
            cs.execute();
            return cs.getLong(5);
        });
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_CompleteRoomRepair' with ACID transaction.
     *
     * @param damageId Primary key ID of the room damage ticket.
     * @return Confirmation status string.
     */
    public String callCompleteRoomRepairProcedure(Long damageId) {
        return jdbcTemplate.execute("{CALL sp_CompleteRoomRepair(?, ?)}", (CallableStatementCallback<String>) cs -> {
            cs.setLong(1, damageId);
            cs.registerOutParameter(2, Types.VARCHAR);
            cs.execute();
            return cs.getString(2);
        });
    }
}
