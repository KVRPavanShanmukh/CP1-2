package com.sim.network;

public class NetworkMessage {
    public enum MessageType {
        BLOCK,
        ATTESTATION,
        BLOCK_REQUEST
    }

    private String messageId;
    private MessageType type;
    private String senderId;
    private String receiverId;
    private Object payload;
    private int sendTick;
    private int deliveryTick;

    public NetworkMessage(String messageId, MessageType type, String senderId, String receiverId, Object payload, int sendTick, int deliveryTick) {
        this.messageId = messageId;
        this.type = type;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.payload = payload;
        this.sendTick = sendTick;
        this.deliveryTick = deliveryTick;
    }

    public String getMessageId() { return messageId; }
    public MessageType getType() { return type; }
    public String getSenderId() { return senderId; }
    public String getReceiverId() { return receiverId; }
    public Object getPayload() { return payload; }
    public int getSendTick() { return sendTick; }
    public int getDeliveryTick() { return deliveryTick; }
}
