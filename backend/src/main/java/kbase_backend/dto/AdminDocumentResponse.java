package kbase_backend.dto;

import java.time.Instant;

public record AdminDocumentResponse(
        Long id,
        Long projectId,
        String projectName,
        String ownerEmail,
        String originalFileName,
        String contentType,
        long fileSize,
        String fileCategory,
        Long uploadedById,
        String uploadedByName,
        Instant createdAt) {
}