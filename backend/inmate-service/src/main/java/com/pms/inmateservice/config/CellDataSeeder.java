package com.pms.inmateservice.config;

import com.pms.inmateservice.model.Cell;
import com.pms.inmateservice.model.Prison;
import com.pms.inmateservice.model.SecurityLevel;
import com.pms.inmateservice.repository.CellRepository;
import com.pms.inmateservice.repository.PrisonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(2) // Run after PrisonDataSeeder
public class CellDataSeeder implements CommandLineRunner {

    private final CellRepository cellRepository;
    private final PrisonRepository prisonRepository;

    @Override
    public void run(String... args) {
        if (cellRepository.count() >= 40) {
            log.info("Cells already seeded ({} cells found), skipping.", cellRepository.count());
            return;
        }

        log.info("Seeding cells for prisons...");
        int totalCells = 0;

        // Welikada Prison (WEL) - Maximum security, large
        totalCells += seedCellsForPrison("WEL", new String[][] {
                { "Block-A", "A-101", "4", "MAXIMUM", "MALE" },
                { "Block-A", "A-102", "4", "MAXIMUM", "MALE" },
                { "Block-A", "A-103", "6", "MAXIMUM", "MALE" },
                { "Block-A", "A-104", "4", "MAXIMUM", "MALE" },
                { "Block-B", "B-101", "6", "MEDIUM", "MALE" },
                { "Block-B", "B-102", "6", "MEDIUM", "MALE" },
                { "Block-B", "B-103", "8", "MEDIUM", "MALE" },
                { "Block-B", "B-104", "8", "MEDIUM", "MALE" },
                { "Block-C", "C-101", "10", "MINIMUM", "MALE" },
                { "Block-C", "C-102", "10", "MINIMUM", "MALE" },
                { "Block-D", "D-101", "6", "MEDIUM", "FEMALE" },
                { "Block-D", "D-102", "6", "MEDIUM", "FEMALE" },
        });

        // Mahara Prison (MAH)
        totalCells += seedCellsForPrison("MAH", new String[][] {
                { "Block-A", "A-201", "4", "MAXIMUM", "MALE" },
                { "Block-A", "A-202", "4", "MAXIMUM", "MALE" },
                { "Block-A", "A-203", "6", "MAXIMUM", "MALE" },
                { "Block-B", "B-201", "8", "MEDIUM", "MALE" },
                { "Block-B", "B-202", "8", "MEDIUM", "MALE" },
                { "Block-B", "B-203", "6", "MEDIUM", "MALE" },
                { "Block-C", "C-201", "10", "MINIMUM", "MALE" },
                { "Block-C", "C-202", "10", "MINIMUM", "MALE" },
        });

        // Colombo Remand Prison (CRP)
        totalCells += seedCellsForPrison("CRP", new String[][] {
                { "Block-A", "A-301", "6", "MEDIUM", "MALE" },
                { "Block-A", "A-302", "6", "MEDIUM", "MALE" },
                { "Block-A", "A-303", "8", "MEDIUM", "MALE" },
                { "Block-B", "B-301", "8", "MEDIUM", "MALE" },
                { "Block-B", "B-302", "8", "MEDIUM", "MALE" },
                { "Block-C", "C-301", "4", "MEDIUM", "FEMALE" },
                { "Block-C", "C-302", "4", "MEDIUM", "FEMALE" },
        });

        // Bogambara Prison (BOG)
        totalCells += seedCellsForPrison("BOG", new String[][] {
                { "Block-A", "A-401", "4", "MAXIMUM", "MALE" },
                { "Block-A", "A-402", "4", "MAXIMUM", "MALE" },
                { "Block-B", "B-401", "6", "MEDIUM", "MALE" },
                { "Block-B", "B-402", "6", "MEDIUM", "MALE" },
                { "Block-C", "C-401", "8", "MINIMUM", "MALE" },
                { "Block-C", "C-402", "8", "MINIMUM", "MALE" },
        });

        // Anuradhapura Remand Prison (ARP)
        totalCells += seedCellsForPrison("ARP", new String[][] {
                { "Block-A", "A-501", "6", "MEDIUM", "MALE" },
                { "Block-A", "A-502", "6", "MEDIUM", "MALE" },
                { "Block-B", "B-501", "8", "MEDIUM", "MALE" },
                { "Block-B", "B-502", "8", "MEDIUM", "MALE" },
                { "Block-C", "C-501", "4", "MEDIUM", "FEMALE" },
        });

        // Pallansena Open Prison Camp (PAL)
        totalCells += seedCellsForPrison("PAL", new String[][] {
                { "Dorm-A", "D-601", "12", "MINIMUM", "MALE" },
                { "Dorm-A", "D-602", "12", "MINIMUM", "MALE" },
                { "Dorm-B", "D-603", "10", "MINIMUM", "MALE" },
                { "Dorm-B", "D-604", "10", "MINIMUM", "MALE" },
        });

        log.info("Successfully seeded {} cells across 6 prisons.", totalCells);
    }

    private int seedCellsForPrison(String prisonCode, String[][] cellData) {
        Prison prison = prisonRepository.findByCode(prisonCode).orElse(null);
        if (prison == null) {
            log.warn("Prison with code {} not found, skipping cell seeding.", prisonCode);
            return 0;
        }

        int count = 0;
        for (String[] data : cellData) {
            Cell cell = new Cell();
            cell.setBlock(data[0]);
            cell.setCellNumber(data[1]);
            cell.setCapacity(Integer.parseInt(data[2]));
            cell.setSecurityLevel(SecurityLevel.valueOf(data[3]));
            cell.setGender(data[4]);
            cell.setPrison(prison);
            cellRepository.save(cell);
            count++;
        }

        log.info("Seeded {} cells for {} ({})", count, prison.getName(), prisonCode);
        return count;
    }
}
