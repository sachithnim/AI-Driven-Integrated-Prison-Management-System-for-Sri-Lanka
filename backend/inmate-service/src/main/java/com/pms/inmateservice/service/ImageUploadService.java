package com.pms.inmateservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ImageUploadService {

    @Value("${file.upload-dir:uploads/inmate-images}")
    private String uploadDir;

    @Value("${file.max-size:10485760}") // 10MB default
    private long maxFileSize;

    @Value("${file.allowed-types:image/jpeg,image/png,image/jpg}")
    private String allowedTypes;

    public String uploadImage(MultipartFile file, Long inmateId, String imageType) throws IOException {
        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 10MB");
        }

        if (!isAllowedType(file.getContentType())) {
            throw new IllegalArgumentException("Invalid file type. Only JPEG and PNG are allowed");
        }

        // Create directory if it doesn't exist
        String uploadPath = uploadDir + "/" + inmateId;
        Path uploadDirectory = Paths.get(uploadPath);
        if (!Files.exists(uploadDirectory)) {
            Files.createDirectories(uploadDirectory);
        }

        // Generate unique filename
        String filename = generateFileName(imageType, file.getOriginalFilename());
        Path filePath = uploadDirectory.resolve(filename);

        // Save file
        Files.write(filePath, file.getBytes());
        log.info("Image uploaded successfully: {} for inmate: {}", filename, inmateId);

        // Return relative path
        return inmateId + "/" + filename;
    }

    public void deleteImage(String imagePath) throws IOException {
        if (imagePath == null || imagePath.isEmpty()) {
            return;
        }

        Path filePath = Paths.get(uploadDir, imagePath);
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            log.info("Image deleted: {}", imagePath);
        }
    }

    public byte[] getImage(String imagePath) throws IOException {
        Path filePath = Paths.get(uploadDir, imagePath);
        if (Files.exists(filePath)) {
            return Files.readAllBytes(filePath);
        }
        throw new IOException("Image not found: " + imagePath);
    }

    public boolean imageExists(String imagePath) {
        if (imagePath == null || imagePath.isEmpty()) {
            return false;
        }
        return Files.exists(Paths.get(uploadDir, imagePath));
    }

    private String generateFileName(String imageType, String originalFilename) {
        String extension = getFileExtension(originalFilename);
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        return imageType + "_" + timestamp + "_" + uuid + "." + extension;
    }

    private String getFileExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        }
        return "jpg";
    }

    private boolean isAllowedType(String contentType) {
        if (contentType == null) {
            return false;
        }
        String[] allowed = allowedTypes.split(",");
        for (String type : allowed) {
            if (contentType.equals(type.trim())) {
                return true;
            }
        }
        return false;
    }
}
