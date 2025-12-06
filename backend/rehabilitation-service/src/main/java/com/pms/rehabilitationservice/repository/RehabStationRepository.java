package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.RehabStation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RehabStationRepository extends JpaRepository<RehabStation, Long> {
    List<RehabStation> findByActiveTrue();
    
    @Query("SELECT s FROM RehabStation s WHERE s.active = true AND s.currentLoad < s.capacity")
    List<RehabStation> findAvailableStations();
}
