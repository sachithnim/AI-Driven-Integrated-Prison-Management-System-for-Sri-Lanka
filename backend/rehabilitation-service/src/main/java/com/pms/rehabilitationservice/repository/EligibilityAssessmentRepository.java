package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.EligibilityAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EligibilityAssessmentRepository extends JpaRepository<EligibilityAssessment, Long> {
    List<EligibilityAssessment> findByInmateIdOrderByAssessedAtAsc(String inmateId);
    List<EligibilityAssessment> findByInmateId(String inmateId);
}
