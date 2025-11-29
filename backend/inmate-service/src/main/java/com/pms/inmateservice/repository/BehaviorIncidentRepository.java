package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.BehaviorIncident;
import com.pms.inmateservice.model.IncidentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BehaviorIncidentRepository extends JpaRepository<BehaviorIncident, Long> {

    List<BehaviorIncident> findByInmateId(Long inmateId);

    Optional<BehaviorIncident> findByIncidentNumber(String incidentNumber);

    @Query("SELECT b FROM BehaviorIncident b WHERE b.inmate.id = :inmateId ORDER BY b.incidentDate DESC")
    List<BehaviorIncident> findByInmateIdOrderByIncidentDateDesc(@Param("inmateId") Long inmateId);

    List<BehaviorIncident> findByIncidentType(IncidentType incidentType);

    @Query("SELECT b FROM BehaviorIncident b WHERE b.resolved = false")
    List<BehaviorIncident> findUnresolvedIncidents();

    @Query("SELECT b FROM BehaviorIncident b WHERE b.severity = :severity")
    List<BehaviorIncident> findBySeverity(@Param("severity") String severity);

    @Query("SELECT b FROM BehaviorIncident b WHERE b.incidentDate BETWEEN :startDate AND :endDate")
    List<BehaviorIncident> findByIncidentDateBetween(@Param("startDate") LocalDateTime startDate, 
                                                     @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(b) FROM BehaviorIncident b WHERE b.inmate.id = :inmateId")
    Long countByInmateId(@Param("inmateId") Long inmateId);
}
