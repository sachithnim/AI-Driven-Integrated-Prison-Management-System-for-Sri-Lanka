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
@Table(name = "education_programs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EducationProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inmate_id", nullable = false)
    private Inmate inmate;

    @Column(nullable = false, length = 100)
    private String programName;

    @Column(length = 50)
    private String programType; // ACADEMIC, VOCATIONAL, SKILLS_TRAINING

    @Column(length = 100)
    private String subject;

    @Column(length = 50)
    private String level; // BASIC, INTERMEDIATE, ADVANCED

    @Column(nullable = false)
    private LocalDate enrollmentDate;

    private LocalDate completionDate;

    @Column(length = 20)
    private String status; // ENROLLED, COMPLETED, DROPPED, FAILED

    @Column(length = 100)
    private String instructor;

    @Column(length = 50)
    private String schedule;

    @Column(length = 100)
    private String location;

    private Integer creditsEarned;

    @Column(length = 20)
    private String grade;

    @Column(length = 20)
    private String attendance; // EXCELLENT, GOOD, POOR

    @Column(columnDefinition = "TEXT")
    private String progressNotes;

    @Column(length = 100)
    private String certificateIssued;

    @Column(columnDefinition = "TEXT")
    private String skills; // Skills acquired

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
