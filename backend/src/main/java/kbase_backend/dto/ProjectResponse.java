package kbase_backend.dto;

import java.time.Instant;

public class ProjectResponse {

    private Long id;
    private String name;
    private String description;
    private Long ownerId;
    private String ownerEmail;
    private Instant createdAt;

    public ProjectResponse(Long id, String name, String description,
            Long ownerId, String ownerEmail, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.ownerId = ownerId;
        this.ownerEmail = ownerEmail;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}