package com.pms.inmateservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pms.inmateservice.dto.PhysicalDescriptionAnalysisDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageAnalysisService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${openai.api-key:${OPENAI_API_KEY:}}")
    private String openaiApiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String openaiModel;

    @Value("${openai.base-url:https://api.openai.com}")
    private String openaiBaseUrl;

    public PhysicalDescriptionAnalysisDTO extractPhysicalDescription(MultipartFile closeFaceImage, MultipartFile fullBodyImage) {
        if ((closeFaceImage == null || closeFaceImage.isEmpty()) && (fullBodyImage == null || fullBodyImage.isEmpty())) {
            throw new IllegalArgumentException("At least one inmate image is required for AI extraction");
        }

        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            throw new IllegalStateException("OpenAI API key is not configured");
        }

        try {
            List<Object> userContent = new ArrayList<>();
            userContent.add(Map.of(
                    "type", "text",
                    "text", "Analyze the uploaded inmate images and extract physical description data. Return only valid JSON with these keys: height, weight, eyeColor, hairColor, identifyingMarks, tattoos. Use concise values. If a field is not visible, return \"Unknown\". Height and weight may be estimated from the full-body image and should be prefixed with \"Approx.\" when estimated."
            ));

            if (closeFaceImage != null && !closeFaceImage.isEmpty()) {
                userContent.add(Map.of(
                        "type", "image_url",
                        "image_url", Map.of("url", toDataUrl(closeFaceImage))
                ));
            }

            if (fullBodyImage != null && !fullBodyImage.isEmpty()) {
                userContent.add(Map.of(
                        "type", "image_url",
                        "image_url", Map.of("url", toDataUrl(fullBodyImage))
                ));
            }

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("model", openaiModel);
            requestBody.put("temperature", 0.2);
            requestBody.put("max_tokens", 500);
            requestBody.put("response_format", Map.of("type", "json_object"));
            requestBody.put("messages", List.of(
                    Map.of(
                            "role", "system",
                            "content", "You extract physical description data from inmate photos. Return only JSON and never add markdown or commentary."
                    ),
                    Map.of(
                            "role", "user",
                            "content", userContent
                    )
            ));

            String responseBody = webClientBuilder
                    .baseUrl(openaiBaseUrl)
                    .defaultHeader("Authorization", "Bearer " + openaiApiKey)
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build()
                    .post()
                    .uri("/v1/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (responseBody == null || responseBody.isBlank()) {
                throw new IllegalStateException("Empty response received from OpenAI");
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                throw new IllegalStateException("Invalid response received from OpenAI");
            }

            String content = choices.get(0).path("message").path("content").asText("");
            String cleanedContent = stripCodeFences(content);
            JsonNode data = objectMapper.readTree(cleanedContent);

            return new PhysicalDescriptionAnalysisDTO(
                    textValue(data, "height"),
                    textValue(data, "weight"),
                    textValue(data, "eyeColor"),
                    textValue(data, "hairColor"),
                    textValue(data, "identifyingMarks"),
                    textValue(data, "tattoos")
            );
        } catch (Exception e) {
            log.error("Failed to extract physical description from images", e);
            throw new RuntimeException("Failed to analyze inmate images: " + e.getMessage(), e);
        }
    }

    private String toDataUrl(MultipartFile file) throws Exception {
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = MimeTypeUtils.APPLICATION_OCTET_STREAM_VALUE;
        }
        String base64 = Base64.getEncoder().encodeToString(file.getBytes());
        return "data:" + contentType + ";base64," + base64;
    }

    private String stripCodeFences(String content) {
        if (content == null) {
            return "{}";
        }
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?\\s*", "");
            trimmed = trimmed.replaceFirst("\\s*```$", "");
        }
        return trimmed;
    }

    private String textValue(JsonNode data, String fieldName) {
        JsonNode node = data.get(fieldName);
        if (node == null || node.isNull()) {
            return "Unknown";
        }
        String value = node.asText("").trim();
        return value.isEmpty() ? "Unknown" : value;
    }
}
