package com.pms.inmateservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cells")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cell {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String block;

    @Column(nullable = false, length = 20)
    private String cellNumber;

    @Column(nullable = false)
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SecurityLevel securityLevel;

    @Column(length = 20)
    private String gender; // MALE, FEMALE

    @ManyToOne
    @JoinColumn(name = "prison_id")
    private Prison prison;

    // Helper method to get full cell identifier
    public String getFullCellId() {
        return block + "-" + cellNumber;
    }
}
