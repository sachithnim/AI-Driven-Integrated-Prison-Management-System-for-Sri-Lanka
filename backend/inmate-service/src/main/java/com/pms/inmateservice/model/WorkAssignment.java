package com.pms.inmateservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_assignments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inmate_id", nullable = false)
    private Inmate inmate;

    @Column(nullable = false, length = 100)
    private String jobTitle;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(length = 100)
    private String location;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @Column(length = 20)
    private String status; // ACTIVE, COMPLETED, TERMINATED

    @Column(length = 100)
    private String supervisor;

    @Column(length = 20)
    private String shift; // MORNING, AFTERNOON, NIGHT

    private Integer hoursPerWeek;

    @Column(length = 50)
    private String payRate;

    @Column(columnDefinition = "TEXT")
    private String responsibilities;

    @Column(columnDefinition = "TEXT")
    private String performanceNotes;

    @Column(length = 20)
    private String performanceRating; // EXCELLENT, GOOD, SATISFACTORY, POOR

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
