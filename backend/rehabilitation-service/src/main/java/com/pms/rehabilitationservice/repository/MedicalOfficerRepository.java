package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.MedicalOfficer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalOfficerRepository extends JpaRepository<MedicalOfficer, Long> {
    Optional<MedicalOfficer> findByOfficerId(String officerId);
    List<MedicalOfficer> findByActiveTrue();
    
    @Query("SELECT m FROM MedicalOfficer m WHERE m.active = true AND m.currentLoad < m.maxCapacity")
    List<MedicalOfficer> findAvailableOfficers();
}
