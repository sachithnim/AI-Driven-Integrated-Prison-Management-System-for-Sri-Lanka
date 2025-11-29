package com.pms.inmateservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenAPIConfig {

    @Bean
    public OpenAPI inmateServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Inmate Service API")
                        .description("API for managing inmates in the Prison Management System")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Prison Management System")
                                .email("support@pms.gov.lk"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html")));
    }
}
