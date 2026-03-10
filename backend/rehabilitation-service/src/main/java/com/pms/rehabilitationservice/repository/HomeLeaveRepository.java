package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.HomeLeave;
import com.pms.rehabilitationservice.model.HomeLeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HomeLeaveRepository extends JpaRepository<HomeLeave, Long> {
    List<HomeLeave> findByInmateId(String inmateId);
    List<HomeLeave> findByStatus(HomeLeaveStatus status);
    List<HomeLeave> findByInmateIdOrderByCreatedAtDesc(String inmateId);
}
