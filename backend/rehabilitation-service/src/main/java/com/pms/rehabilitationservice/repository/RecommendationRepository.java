package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.Recommendation;
import com.pms.rehabilitationservice.model.RecommendationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
    List<Recommendation> findByInmateId(String inmateId);
    List<Recommendation> findByStatus(RecommendationStatus status);
    List<Recommendation> findByInmateIdAndStatus(String inmateId, RecommendationStatus status);
}
