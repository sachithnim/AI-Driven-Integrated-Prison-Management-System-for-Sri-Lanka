package com.pms.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS Configuration for API Gateway
 * Allows frontend applications to make cross-origin requests
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();

        // Allow requests from these origins
        corsConfig.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*"));

        // Allow all HTTP methods
        corsConfig.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Allow all headers
        corsConfig.setAllowedHeaders(List.of("*"));

        // Allow credentials (cookies, authorization headers)
        corsConfig.setAllowCredentials(true);

        // Cache preflight response for 1 hour
        corsConfig.setMaxAge(3600L);

        // Expose these headers to the client
        corsConfig.setExposedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-Total-Count"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
}
