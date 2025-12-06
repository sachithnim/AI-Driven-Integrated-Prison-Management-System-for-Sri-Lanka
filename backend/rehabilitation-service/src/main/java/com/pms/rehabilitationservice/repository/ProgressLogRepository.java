package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.ProgressLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProgressLogRepository extends JpaRepository<ProgressLog, Long> {
    List<ProgressLog> findByInmateId(String inmateId);
    List<ProgressLog> findByRecommendationId(Long recommendationId);
}
