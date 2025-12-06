package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.Program;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProgramRepository extends JpaRepository<Program, Long> {
    List<Program> findByActiveTrue();
    List<Program> findByType(String type);
}
