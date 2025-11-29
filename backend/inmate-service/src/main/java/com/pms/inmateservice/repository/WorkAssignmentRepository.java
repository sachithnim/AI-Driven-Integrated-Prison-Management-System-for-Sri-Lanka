package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.WorkAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkAssignmentRepository extends JpaRepository<WorkAssignment, Long> {

    List<WorkAssignment> findByInmateId(Long inmateId);

    @Query("SELECT w FROM WorkAssignment w WHERE w.inmate.id = :inmateId AND w.status = 'ACTIVE'")
    List<WorkAssignment> findActiveAssignmentsByInmateId(@Param("inmateId") Long inmateId);

    List<WorkAssignment> findByDepartment(String department);

    @Query("SELECT w FROM WorkAssignment w WHERE w.status = 'ACTIVE'")
    List<WorkAssignment> findAllActiveAssignments();
}
