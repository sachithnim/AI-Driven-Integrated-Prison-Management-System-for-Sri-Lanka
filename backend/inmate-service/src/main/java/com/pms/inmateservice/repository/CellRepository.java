package com.pms.inmateservice.repository;

import com.pms.inmateservice.model.Cell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CellRepository extends JpaRepository<Cell, Long> {
    List<Cell> findByBlock(String block);
    Optional<Cell> findByBlockAndCellNumber(String block, String cellNumber);
}
