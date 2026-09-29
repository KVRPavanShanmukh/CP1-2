package com.sim.service;

import com.sim.model.TickUpdate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketStreamService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void streamTickUpdate(TickUpdate update) {
        // Send real-time updates to React frontend
        messagingTemplate.convertAndSend("/topic/simulation/" + update.getSimulationId(), update);
    }
}
