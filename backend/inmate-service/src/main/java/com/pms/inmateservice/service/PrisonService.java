package com.pms.inmateservice.service;

import com.pms.inmateservice.model.Prison;
import com.pms.inmateservice.model.PrisonType;
import com.pms.inmateservice.model.SecurityLevel;
import com.pms.inmateservice.repository.PrisonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class PrisonService {

    private final PrisonRepository prisonRepository;

    public List<Prison> getAllPrisons() {
        return prisonRepository.findAll();
    }

    public List<Prison> getActivePrisons() {
        return prisonRepository.findByActiveTrue();
    }

    public Prison getPrisonById(Long id) {
        return prisonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prison not found: " + id));
    }

    public Prison getPrisonByCode(String code) {
        return prisonRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Prison not found with code: " + code));
    }

    public List<Prison> getPrisonsByType(PrisonType type) {
        return prisonRepository.findByType(type);
    }

    public List<Prison> getAvailablePrisons() {
        return prisonRepository.findAvailablePrisons();
    }

    public List<Prison> getAvailableBySecurityLevel(SecurityLevel securityLevel) {
        return prisonRepository.findAvailableBySecurityLevel(securityLevel);
    }

    @Transactional
    public Prison createPrison(Prison prison) {
        return prisonRepository.save(prison);
    }

    @Transactional
    public Prison updatePrison(Long id, Prison updated) {
        Prison prison = getPrisonById(id);
        prison.setName(updated.getName());
        prison.setCode(updated.getCode());
        prison.setType(updated.getType());
        prison.setDistrict(updated.getDistrict());
        prison.setProvince(updated.getProvince());
        prison.setLatitude(updated.getLatitude());
        prison.setLongitude(updated.getLongitude());
        prison.setTotalCapacity(updated.getTotalCapacity());
        prison.setCurrentPopulation(updated.getCurrentPopulation());
        prison.setSecurityLevel(updated.getSecurityLevel());
        prison.setAcceptsConvicted(updated.getAcceptsConvicted());
        prison.setAcceptsUnconvicted(updated.getAcceptsUnconvicted());
        prison.setAvailablePrograms(updated.getAvailablePrograms());
        prison.setActive(updated.getActive());
        return prisonRepository.save(prison);
    }

    @Transactional
    public void updatePopulation(Long prisonId, int change) {
        Prison prison = getPrisonById(prisonId);
        prison.setCurrentPopulation(Math.max(0, prison.getCurrentPopulation() + change));
        prisonRepository.save(prison);
    }

    /**
     * Get occupancy percentage for a prison
     */
    public double getOccupancyRate(Long prisonId) {
        Prison prison = getPrisonById(prisonId);
        if (prison.getTotalCapacity() == 0)
            return 0;
        return (double) prison.getCurrentPopulation() / prison.getTotalCapacity() * 100;
    }
}
