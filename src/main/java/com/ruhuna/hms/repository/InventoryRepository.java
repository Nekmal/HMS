package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * JPA repository for master inventory items and catalog data.
 */
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
}
