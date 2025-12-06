package com.pms.rehabilitationservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;

@SpringBootApplication
@EnableKafka
public class RehabilitationServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(RehabilitationServiceApplication.class, args);
	}

}
