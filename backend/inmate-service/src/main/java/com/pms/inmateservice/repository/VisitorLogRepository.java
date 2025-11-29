package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.VisitorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VisitorLogRepository extends JpaRepository<VisitorLog, Long> {

    List<VisitorLog> findByInmateId(Long inmateId);

    @Query("SELECT v FROM VisitorLog v WHERE v.inmate.id = :inmateId ORDER BY v.visitDate DESC")
    List<VisitorLog> findByInmateIdOrderByVisitDateDesc(@Param("inmateId") Long inmateId);

    @Query("SELECT v FROM VisitorLog v WHERE v.visitDate BETWEEN :startDate AND :endDate")
    List<VisitorLog> findByVisitDateBetween(@Param("startDate") LocalDateTime startDate, 
                                            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT v FROM VisitorLog v WHERE v.contraband = true")
    List<VisitorLog> findContrabandIncidents();
}
