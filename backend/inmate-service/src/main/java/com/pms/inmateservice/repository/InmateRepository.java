package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.Inmate;
import com.pms.inmateservice.model.InmateStatus;
import com.pms.inmateservice.model.SecurityLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InmateRepository extends JpaRepository<Inmate, Long> {

    Optional<Inmate> findByBookingNumber(String bookingNumber);

    List<Inmate> findByStatus(InmateStatus status);

    List<Inmate> findBySecurityLevel(SecurityLevel securityLevel);

    List<Inmate> findByCurrentFacility(String facility);

    List<Inmate> findByCurrentFacilityAndBlock(String facility, String block);

    @Query("SELECT i FROM Inmate i WHERE " +
           "LOWER(i.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(i.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(i.bookingNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(i.nic) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Inmate> searchInmates(@Param("searchTerm") String searchTerm);

    @Query("SELECT i FROM Inmate i WHERE i.paroleEligibilityDate BETWEEN :startDate AND :endDate")
    List<Inmate> findByParoleEligibilityDateBetween(@Param("startDate") LocalDate startDate, 
                                                     @Param("endDate") LocalDate endDate);

    @Query("SELECT i FROM Inmate i WHERE i.sentenceEndDate BETWEEN :startDate AND :endDate AND i.status = 'ACTIVE'")
    List<Inmate> findUpcomingReleases(@Param("startDate") LocalDate startDate, 
                                      @Param("endDate") LocalDate endDate);

    @Query("SELECT i FROM Inmate i WHERE i.gangAffiliation = true")
    List<Inmate> findGangAffiliatedInmates();

    @Query("SELECT i FROM Inmate i WHERE i.escapeRisk = true OR i.violentHistory = true")
    List<Inmate> findHighRiskInmates();

    @Query("SELECT COUNT(i) FROM Inmate i WHERE i.status = :status")
    Long countByStatus(@Param("status") InmateStatus status);

    @Query("SELECT COUNT(i) FROM Inmate i WHERE i.currentFacility = :facility AND i.status = 'ACTIVE'")
    Long countActiveInmatesByFacility(@Param("facility") String facility);

    @Query("SELECT i FROM Inmate i WHERE i.admissionDate BETWEEN :startDate AND :endDate")
    List<Inmate> findByAdmissionDateBetween(@Param("startDate") LocalDate startDate, 
                                            @Param("endDate") LocalDate endDate);

    @Query("SELECT DISTINCT i.currentFacility FROM Inmate i WHERE i.currentFacility IS NOT NULL")
    List<String> findAllFacilities();
}
