package com.pms.inmateservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "visitor_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitorLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inmate_id", nullable = false)
    private Inmate inmate;

    @Column(nullable = false, length = 100)
    private String visitorName;

    @Column(nullable = false, length = 50)
    private String relationship;

    @Column(length = 20)
    private String visitorId; // ID card number

    @Column(length = 20)
    private String contactNumber;

    @Column(nullable = false)
    private LocalDateTime visitDate;

    @Column(nullable = false)
    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    @Column(length = 50)
    private String visitLocation;

    @Column(length = 20)
    private String visitType; // IN_PERSON, VIDEO_CALL, etc.

    @Column(length = 100)
    private String approvedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private Boolean contraband = false;

    @Column(length = 500)
    private String contrabandDetails;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
