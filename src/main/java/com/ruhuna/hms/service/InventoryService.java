package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Inventory;
import java.util.List;

public interface InventoryService {
    List<Inventory> getAllInventory();
    Inventory getInventoryById(Long id);
    Inventory createInventory(Inventory inventory);
}
