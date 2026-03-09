package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.Prison;
import com.pms.inmateservice.model.PrisonType;
import com.pms.inmateservice.model.SecurityLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrisonRepository extends JpaRepository<Prison, Long> {
    Optional<Prison> findByCode(String code);

    Optional<Prison> findByName(String name);

    List<Prison> findByType(PrisonType type);

    List<Prison> findByActiveTrue();

    List<Prison> findByDistrict(String district);

    @Query("SELECT p FROM Prison p WHERE p.active = true AND p.currentPopulation < p.totalCapacity")
    List<Prison> findAvailablePrisons();

    @Query("SELECT p FROM Prison p WHERE p.active = true AND p.securityLevel = :securityLevel AND p.currentPopulation < p.totalCapacity")
    List<Prison> findAvailableBySecurityLevel(SecurityLevel securityLevel);
}
