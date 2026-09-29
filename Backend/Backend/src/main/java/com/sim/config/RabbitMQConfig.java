package com.sim.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String JOBS_QUEUE = "simulation.jobs.queue";
    public static final String TICKS_QUEUE = "simulation.ticks.queue";
    public static final String RESULTS_QUEUE = "simulation.results.queue";
    public static final String EXCHANGE_NAME = "simulation.exchange";
    
    @Bean
    public Queue jobsQueue() {
        return new Queue(JOBS_QUEUE, true);
    }

    @Bean
    public Queue ticksQueue() {
        return new Queue(TICKS_QUEUE, true);
    }

    @Bean
    public Queue resultsQueue() {
        return new Queue(RESULTS_QUEUE, true);
    }

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Binding bindingJobs(Queue jobsQueue, TopicExchange exchange) {
        return BindingBuilder.bind(jobsQueue).to(exchange).with("simulation.jobs.#");
    }

    @Bean
    public Binding bindingTicks(Queue ticksQueue, TopicExchange exchange) {
        return BindingBuilder.bind(ticksQueue).to(exchange).with("simulation.ticks.#");
    }

    @Bean
    public Binding bindingResults(Queue resultsQueue, TopicExchange exchange) {
        return BindingBuilder.bind(resultsQueue).to(exchange).with("simulation.results.#");
    }
}
