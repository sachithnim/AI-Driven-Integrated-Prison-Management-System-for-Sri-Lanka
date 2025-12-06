package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.MedicalReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalReportRepository extends JpaRepository<MedicalReport, Long> {
    List<MedicalReport> findByInmateId(String inmateId);
}
