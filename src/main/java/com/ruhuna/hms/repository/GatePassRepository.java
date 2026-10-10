package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.GatePass;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GatePassRepository extends JpaRepository<GatePass, Long> {
    List<GatePass> findByUserId(Long userId);
}
