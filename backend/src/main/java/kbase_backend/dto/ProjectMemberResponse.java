package kbase_backend.dto;

import java.time.Instant;

public class ProjectMemberResponse {

    private Long userId;
    private String name;
    private String email;
    private String role;
    private Instant joinedAt;

    public ProjectMemberResponse(Long userId, String name, String email,
            String role, Instant joinedAt) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }
}