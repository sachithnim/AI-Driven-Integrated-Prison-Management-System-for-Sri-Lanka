package com.pms.inmateservice.service;

import com.pms.inmateservice.dto.CellDTO;
import com.pms.inmateservice.model.Cell;
import com.pms.inmateservice.model.SecurityLevel;
import com.pms.inmateservice.repository.CellRepository;
import com.pms.inmateservice.repository.InmateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CellService {

    private final CellRepository cellRepository;
    private final InmateRepository inmateRepository;

    public List<Cell> getAllCells() {
        return cellRepository.findAll();
    }

    public Cell getCellById(Long id) {
        return cellRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cell not found with id: " + id));
    }

    @Transactional
    public Cell createCell(CellDTO cellDTO) {
        Cell cell = new Cell();
        cell.setBlock(cellDTO.getBlock());
        cell.setCellNumber(cellDTO.getCellNumber());
        cell.setCapacity(cellDTO.getCapacity());
        // Default to MEDIUM if not provided, or handle in DTO
        // Assuming DTO has securityLevel string or enum
        // For now, let's assume the DTO passed here is the one we created earlier which might need updates
        // Let's update CellDTO to include securityLevel first or handle it here.
        // The existing CellDTO was: block, cellNumber, capacity, currentCount.
        // We need a request DTO or update the existing one.
        // Let's assume we update the CellDTO to include securityLevel.
        cell.setSecurityLevel(SecurityLevel.MEDIUM); // Default
        
        return cellRepository.save(cell);
    }
    
    @Transactional
    public Cell createCell(Cell cell) {
        return cellRepository.save(cell);
    }

    @Transactional
    public Cell updateCell(Long id, Cell cellDetails) {
        Cell cell = getCellById(id);
        cell.setBlock(cellDetails.getBlock());
        cell.setCellNumber(cellDetails.getCellNumber());
        cell.setCapacity(cellDetails.getCapacity());
        cell.setSecurityLevel(cellDetails.getSecurityLevel());
        cell.setGender(cellDetails.getGender());
        return cellRepository.save(cell);
    }

    @Transactional
    public void deleteCell(Long id) {
        cellRepository.deleteById(id);
    }
}
