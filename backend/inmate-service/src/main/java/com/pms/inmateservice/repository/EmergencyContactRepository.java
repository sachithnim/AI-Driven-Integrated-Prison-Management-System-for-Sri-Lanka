package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, Long> {

    List<EmergencyContact> findByInmateId(Long inmateId);

    List<EmergencyContact> findByInmateIdAndIsPrimaryTrue(Long inmateId);
}
