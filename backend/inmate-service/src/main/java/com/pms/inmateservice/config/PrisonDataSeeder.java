package com.pms.inmateservice.config;

import com.pms.inmateservice.model.Prison;
import com.pms.inmateservice.model.PrisonType;
import com.pms.inmateservice.model.SecurityLevel;
import com.pms.inmateservice.repository.PrisonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds all 33 Sri Lankan prison institutions on application startup
 * if the prison table is empty.
 */
@Component
@Slf4j
@RequiredArgsConstructor
@Order(1)
public class PrisonDataSeeder implements CommandLineRunner {

        private final PrisonRepository prisonRepository;

        @Override
        public void run(String... args) {
                if (prisonRepository.count() > 0) {
                        log.info("Prison data already seeded ({} records)", prisonRepository.count());
                        return;
                }
                log.info("Seeding 33 Sri Lankan prison institutions...");

                List<Prison> prisons = List.of(
                                prison("Welikada Prison", "WEL", PrisonType.CLOSED_PRISON, "Colombo", "Western", 6.9147,
                                                79.8788, 1700,
                                                SecurityLevel.MAXIMUM, true, false,
                                                List.of("Bakery", "Carpentry", "Printing", "Tailoring")),
                                prison("Colombo Remand Prison", "CRP", PrisonType.REMAND_PRISON, "Colombo", "Western",
                                                6.9271, 79.8612,
                                                800, SecurityLevel.MAXIMUM, false, true,
                                                List.of()),
                                prison("New Magazine Remand Prison", "NMP", PrisonType.REMAND_PRISON, "Colombo",
                                                "Western", 6.9350,
                                                79.8500, 1200, SecurityLevel.MAXIMUM, false, true,
                                                List.of()),
                                prison("Mahara Prison", "MAH", PrisonType.CLOSED_PRISON, "Gampaha", "Western", 7.0512,
                                                79.9445, 900,
                                                SecurityLevel.MAXIMUM, true, false,
                                                List.of("Agriculture", "Bakery", "Tailoring", "Carpentry")),
                                prison("Bogambara Prison", "BOG", PrisonType.CLOSED_PRISON, "Kandy", "Central", 7.2925,
                                                80.6356, 700,
                                                SecurityLevel.MAXIMUM, true, false,
                                                List.of("Bakery", "Carpentry", "Tailoring")),
                                prison("Jaffna Remand Prison", "JAF", PrisonType.REMAND_PRISON, "Jaffna", "Northern",
                                                9.6615, 80.0255,
                                                350, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Anuradhapura Remand Prison", "ANR", PrisonType.REMAND_PRISON, "Anuradhapura",
                                                "North Central",
                                                8.3114, 80.4037, 400, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Badulla Remand Prison", "BAD", PrisonType.REMAND_PRISON, "Badulla", "Uva",
                                                6.9934, 81.0550, 300,
                                                SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Batticaloa Remand Prison", "BAT", PrisonType.REMAND_PRISON, "Batticaloa",
                                                "Eastern", 7.7310,
                                                81.7000, 350, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Galle Remand Prison", "GAL", PrisonType.REMAND_PRISON, "Galle", "Southern",
                                                6.0535, 80.2210,
                                                400, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Matara Remand Prison", "MAT", PrisonType.REMAND_PRISON, "Matara", "Southern",
                                                5.9549, 80.5350,
                                                300, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Angunakolapelessa Prison", "ANG", PrisonType.CLOSED_PRISON, "Hambantota",
                                                "Southern", 6.2200,
                                                80.8800, 500, SecurityLevel.MAXIMUM, true, false,
                                                List.of("Agriculture", "Masonry", "Motor Mechanism")),
                                prison("Negombo Remand Prison", "NEG", PrisonType.REMAND_PRISON, "Gampaha", "Western",
                                                7.2083, 79.8358,
                                                500, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Homagama T.S.Y.O.", "HTS", PrisonType.TRAINING_SCHOOL, "Colombo", "Western",
                                                6.8400, 80.0020,
                                                200, SecurityLevel.MINIMUM, true, false,
                                                List.of("Carpentry", "Tailoring", "Agriculture", "Bakery")),
                                prison("Trincomalee Remand Prison", "TRI", PrisonType.REMAND_PRISON, "Trincomalee",
                                                "Eastern", 8.5874,
                                                81.2152, 250, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Kegalle Remand Prison", "KEG", PrisonType.REMAND_PRISON, "Kegalle",
                                                "Sabaragamuwa", 7.2513,
                                                80.3464, 250, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Kalutara Remand Prison", "KAL", PrisonType.REMAND_PRISON, "Kalutara", "Western",
                                                6.5854,
                                                79.9607, 400, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Kuruwita Remand Prison", "KUR", PrisonType.REMAND_PRISON, "Ratnapura",
                                                "Sabaragamuwa", 6.7750,
                                                80.3650, 200, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Boossa Prison", "BOO", PrisonType.CLOSED_PRISON, "Galle", "Southern", 6.1300,
                                                80.2600, 500,
                                                SecurityLevel.MAXIMUM, true, false,
                                                List.of("Blacksmith / Welding", "Motor Mechanism", "Agriculture")),
                                prison("Pallekele Open Prison Camp", "POC", PrisonType.OPEN_PRISON_CAMP, "Kandy",
                                                "Central", 7.2800,
                                                80.6600, 200, SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture", "Carpentry", "Masonry")),
                                prison("Meethirigala Work Camp", "MWC", PrisonType.WORK_CAMP, "Gampaha", "Western",
                                                7.0980, 80.1560,
                                                150, SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture", "Carpentry")),
                                prison("Homagama Work Camp", "HWC", PrisonType.WORK_CAMP, "Colombo", "Western", 6.8440,
                                                80.0090, 150,
                                                SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture", "Bakery", "Tailoring")),
                                prison("Weerawila Work Camp", "WWC", PrisonType.WORK_CAMP, "Hambantota", "Southern",
                                                6.2640, 81.2360,
                                                150, SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture")),
                                prison("Taldena C.C.Y.O.", "TCC", PrisonType.CORRECTIONAL_CENTRE, "Badulla", "Uva",
                                                6.8800, 81.0200,
                                                150, SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture", "Carpentry", "Tailoring")),
                                prison("Kandewatta", "KDW", PrisonType.WORK_CAMP, "Nuwara Eliya", "Central", 6.9700,
                                                80.7800, 100,
                                                SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture")),
                                prison("Anuradhapura Work Camp", "AWC", PrisonType.WORK_CAMP, "Anuradhapura",
                                                "North Central", 8.3500,
                                                80.3800, 150, SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture")),
                                prison("Pallansena C.C.Y.O.", "PCC", PrisonType.CORRECTIONAL_CENTRE, "Gampaha",
                                                "Western", 7.1200,
                                                80.0800, 150, SecurityLevel.MINIMUM, true, false,
                                                List.of("Carpentry", "Tailoring", "Agriculture", "Bakery")),
                                prison("Polonnaruwa Remand Prison", "POL", PrisonType.REMAND_PRISON, "Polonnaruwa",
                                                "North Central",
                                                7.9403, 81.0188, 200, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Monaragala Remand Prison", "MON", PrisonType.REMAND_PRISON, "Monaragala", "Uva",
                                                6.8728,
                                                81.3507, 150, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Vavuniya Remand Prison", "VAV", PrisonType.REMAND_PRISON, "Vavuniya",
                                                "Northern", 8.7514,
                                                80.4971, 200, SecurityLevel.MEDIUM, true, true,
                                                List.of()),
                                prison("Kadurugasara Work Camp", "KWC", PrisonType.WORK_CAMP, "Kurunegala",
                                                "North Western", 7.4900,
                                                80.3700, 100, SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture")),
                                prison("Hangilipola Work Camp", "HGW", PrisonType.WORK_CAMP, "Nuwara Eliya", "Central",
                                                7.0500, 80.5200,
                                                100, SecurityLevel.MINIMUM, true, false,
                                                List.of("Agriculture")),
                                prison("Ambepussa - Paboda Meth Sevana", "AMS", PrisonType.DRUG_REHABILITATION,
                                                "Kurunegala",
                                                "North Western", 7.2500, 80.2200, 100, SecurityLevel.MINIMUM, true,
                                                false,
                                                List.of("Agriculture", "Tailoring")));

                prisonRepository.saveAll(prisons);
                log.info("Successfully seeded {} prisons", prisons.size());
        }

        private Prison prison(String name, String code, PrisonType type, String district, String province,
                        Double lat, Double lng, Integer capacity, SecurityLevel security,
                        Boolean convicted, Boolean unconvicted, List<String> programs) {
                Prison p = new Prison();
                p.setName(name);
                p.setCode(code);
                p.setType(type);
                p.setDistrict(district);
                p.setProvince(province);
                p.setLatitude(lat);
                p.setLongitude(lng);
                p.setTotalCapacity(capacity);
                p.setCurrentPopulation(0);
                p.setSecurityLevel(security);
                p.setAcceptsConvicted(convicted);
                p.setAcceptsUnconvicted(unconvicted);
                p.setAvailablePrograms(programs);
                p.setActive(true);
                return p;
        }
}
