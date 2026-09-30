package kbase_backend.controller;

import kbase_backend.dto.DocumentResponse;
import kbase_backend.entity.Document;
import kbase_backend.service.DocumentService;
import kbase_backend.service.StorageService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final StorageService storageService;

    public DocumentController(DocumentService documentService, StorageService storageService) {
        this.documentService = documentService;
        this.storageService = storageService;
    }

    // Any owner or member of the project can upload (enforced in the service).
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse upload(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        Document document = documentService.uploadDocument(projectId, authentication.getName(), file);
        return toResponse(document);
    }

    @GetMapping
    public List<DocumentResponse> list(
            @PathVariable Long projectId,
            Authentication authentication) {

        return documentService.listDocuments(projectId, authentication.getName())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Case-insensitive filename search within the project. An empty/missing
    // "query" behaves exactly like the plain list endpoint above.
    @GetMapping("/search")
    public List<DocumentResponse> search(
            @PathVariable Long projectId,
            @RequestParam(value = "query", required = false) String query,
            Authentication authentication) {

        return documentService.searchDocuments(projectId, authentication.getName(), query)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{documentId}")
    public DocumentResponse getOne(
            @PathVariable Long projectId,
            @PathVariable Long documentId,
            Authentication authentication) {

        return toResponse(documentService.getDocument(projectId, documentId, authentication.getName()));
    }

    // Streams the file straight from MinIO instead of buffering it in memory.
    @GetMapping("/{documentId}/download")
    public ResponseEntity<InputStreamResource> download(
            @PathVariable Long projectId,
            @PathVariable Long documentId,
            Authentication authentication) {

        Document document = documentService.getDocument(projectId, documentId, authentication.getName());
        InputStream fileStream = storageService.download(document.getStorageKey());

        // Send both forms: "filename=" for older/simpler clients (e.g. curl.exe on
        // Windows, which doesn't parse filename*=), and "filename*=" (RFC 5987) so
        // modern browsers/JS clients get the correctly-encoded Unicode name.
        String asciiFallbackName = document.getOriginalFileName().replaceAll("[^\\x20-\\x7E]", "_");
        String encodedFileName = URLEncoder.encode(document.getOriginalFileName(), StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + asciiFallbackName + "\"; filename*=UTF-8''" + encodedFileName)
                .contentLength(document.getFileSize())
                .body(new InputStreamResource(fileStream));
    }

    // Only the uploader or the project owner can delete (enforced in the service).
    @DeleteMapping("/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long projectId,
            @PathVariable Long documentId,
            Authentication authentication) {

        documentService.deleteDocument(projectId, documentId, authentication.getName());
    }

    private DocumentResponse toResponse(Document document) {
        return new DocumentResponse(
                document.getId(),
                document.getOriginalFileName(),
                document.getContentType(),
                document.getFileSize(),
                document.getFileCategory(),
                document.getUploadedBy().getId(),
                document.getUploadedBy().getName(),
                document.getCreatedAt());
    }
}