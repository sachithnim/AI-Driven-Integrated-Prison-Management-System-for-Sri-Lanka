package com.pms.inmateservice.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic inmateAdmittedTopic() {
        return TopicBuilder.name("inmate.admitted")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic inmateReleasedTopic() {
        return TopicBuilder.name("inmate.released")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic inmateTransferredTopic() {
        return TopicBuilder.name("inmate.transferred")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic behaviorIncidentTopic() {
        return TopicBuilder.name("inmate.behavior.incident")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic visitorLogTopic() {
        return TopicBuilder.name("inmate.visitor.log")
                .partitions(3)
                .replicas(1)
                .build();
    }
}
