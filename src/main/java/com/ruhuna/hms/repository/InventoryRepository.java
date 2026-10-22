package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * ============================================================================
 * Inventory Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'inventory' table using Spring Data JPA.
 * 
 * Provides CRUD operations for master warehouse items, category filtering,
 * and stock quantity updates.
 * 
 * Performance Index Optimization:
 * - Queries benefit from index 'idx_inventory_category_avail' on (category, available_quantity).
 * ============================================================================
 */
@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
}

