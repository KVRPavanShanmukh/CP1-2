package com.sim.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "simulation.exchange";
    
    // Queues
    public static final String JOBS_QUEUE = "simulation.jobs.start";
    public static final String TICKS_QUEUE = "simulation.ticks";
    public static final String RESULTS_QUEUE = "simulation.results";

    // Routing keys
    public static final String JOBS_ROUTING_KEY = "simulation.jobs.start";
    public static final String TICKS_ROUTING_KEY = "simulation.ticks.#";
    public static final String RESULTS_ROUTING_KEY = "simulation.results.#";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue jobsQueue() {
        return new Queue(JOBS_QUEUE, false);
    }

    @Bean
    public Queue ticksQueue() {
        return new Queue(TICKS_QUEUE, false);
    }

    @Bean
    public Queue resultsQueue() {
        return new Queue(RESULTS_QUEUE, false);
    }

    @Bean
    public Binding bindingJobsQueue(Queue jobsQueue, TopicExchange exchange) {
        return BindingBuilder.bind(jobsQueue).to(exchange).with(JOBS_ROUTING_KEY);
    }

    @Bean
    public Binding bindingTicksQueue(Queue ticksQueue, TopicExchange exchange) {
        return BindingBuilder.bind(ticksQueue).to(exchange).with(TICKS_ROUTING_KEY);
    }

    @Bean
    public Binding bindingResultsQueue(Queue resultsQueue, TopicExchange exchange) {
        return BindingBuilder.bind(resultsQueue).to(exchange).with(RESULTS_ROUTING_KEY);
    }
}
