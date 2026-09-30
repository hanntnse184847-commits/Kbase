package kbase_backend.dto;

import java.time.Instant;

public class DocumentResponse {

    private Long id;
    private String originalFileName;
    private String contentType;
    private long fileSize;
    private String fileCategory;
    private Long uploadedById;
    private String uploadedByName;
    private Instant createdAt;

    public DocumentResponse(Long id, String originalFileName, String contentType, long fileSize,
            String fileCategory, Long uploadedById, String uploadedByName, Instant createdAt) {
        this.id = id;
        this.originalFileName = originalFileName;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.fileCategory = fileCategory;
        this.uploadedById = uploadedById;
        this.uploadedByName = uploadedByName;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public String getFileCategory() {
        return fileCategory;
    }

    public Long getUploadedById() {
        return uploadedById;
    }

    public String getUploadedByName() {
        return uploadedByName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
