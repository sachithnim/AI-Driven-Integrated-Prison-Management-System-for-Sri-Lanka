package com.pms.inmateservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    @Bean
    public WebClient rehabilitationServiceWebClient(WebClient.Builder builder) {
        return builder.baseUrl("http://localhost:4006").build();
    }

    @Bean
    public WebClient authServiceWebClient(WebClient.Builder builder) {
        return builder.baseUrl("http://localhost:4005").build();
    }
}
