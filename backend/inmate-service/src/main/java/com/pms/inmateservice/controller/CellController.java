package com.pms.inmateservice.controller;

import com.pms.inmateservice.model.Cell;
import com.pms.inmateservice.service.CellService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/cells")
@RequiredArgsConstructor
public class CellController {

    private final CellService cellService;

    @GetMapping
    public ResponseEntity<List<Cell>> getAllCells() {
        return ResponseEntity.ok(cellService.getAllCells());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cell> getCellById(@PathVariable Long id) {
        return ResponseEntity.ok(cellService.getCellById(id));
    }

    @PostMapping
    public ResponseEntity<Cell> createCell(@RequestBody Cell cell) {
        return ResponseEntity.ok(cellService.createCell(cell));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cell> updateCell(@PathVariable Long id, @RequestBody Cell cell) {
        return ResponseEntity.ok(cellService.updateCell(id, cell));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCell(@PathVariable Long id) {
        cellService.deleteCell(id);
        return ResponseEntity.noContent().build();
    }
}
