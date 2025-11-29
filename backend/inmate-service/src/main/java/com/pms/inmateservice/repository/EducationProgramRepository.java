package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.EducationProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EducationProgramRepository extends JpaRepository<EducationProgram, Long> {

    List<EducationProgram> findByInmateId(Long inmateId);

    @Query("SELECT e FROM EducationProgram e WHERE e.inmate.id = :inmateId AND e.status = 'ENROLLED'")
    List<EducationProgram> findActiveEnrollmentsByInmateId(@Param("inmateId") Long inmateId);

    List<EducationProgram> findByProgramType(String programType);

    @Query("SELECT e FROM EducationProgram e WHERE e.status = 'ENROLLED'")
    List<EducationProgram> findAllActiveEnrollments();

    @Query("SELECT e FROM EducationProgram e WHERE e.inmate.id = :inmateId AND e.status = 'COMPLETED'")
    List<EducationProgram> findCompletedProgramsByInmateId(@Param("inmateId") Long inmateId);
}
