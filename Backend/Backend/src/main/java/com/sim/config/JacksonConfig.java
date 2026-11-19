package com.sim.config;

import java.io.IOException;
import java.time.Instant;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 2 mapper used for the RabbitMQ payloads (job, tick, result) and for reading the
 * archived research JSON.
 *
 * <p>Spring Boot 4 auto-configures a Jackson 3 mapper for the HTTP layer, so the
 * {@code com.fasterxml.jackson.databind.ObjectMapper} used by the messaging classes is
 * provided explicitly here. {@code SimulationConfig.createdAt} is a {@link Instant}; the
 * Java-time module is not a test/runtime dependency, so the two handlers below serialize it
 * as an ISO-8601 string and parse it back.</p>
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule("chain55-time");
        module.addSerializer(Instant.class, new JsonSerializer<Instant>() {
            @Override
            public void serialize(Instant value, JsonGenerator generator, SerializerProvider serializers)
                    throws IOException {
                generator.writeString(value.toString());
            }
        });
        module.addDeserializer(Instant.class, new JsonDeserializer<Instant>() {
            @Override
            public Instant deserialize(JsonParser parser, DeserializationContext context) throws IOException {
                String text = parser.getText();
                return text == null || text.isBlank() ? null : Instant.parse(text.trim());
            }
        });
        mapper.registerModule(module);
        return mapper;
    }
}
