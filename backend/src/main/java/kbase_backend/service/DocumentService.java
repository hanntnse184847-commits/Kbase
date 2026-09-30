package kbase_backend.service;

import kbase_backend.entity.Document;
import kbase_backend.entity.Project;
import kbase_backend.entity.User;
import kbase_backend.exception.BadRequestException;
import kbase_backend.exception.ForbiddenActionException;
import kbase_backend.exception.ResourceNotFoundException;
import kbase_backend.repository.DocumentRepository;
import kbase_backend.repository.ProjectMemberRepository;
import kbase_backend.repository.ProjectRepository;
import kbase_backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentService {

    // Extension -> category, per the KBase spec (documents / images / videos).
    private static final Map<String, String> EXTENSION_CATEGORIES = buildExtensionCategories();

    private final DocumentRepository documentRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

    public DocumentService(
            DocumentRepository documentRepository,
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            UserRepository userRepository,
            StorageService storageService) {
        this.documentRepository = documentRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    // Any project owner or member can upload.
    public Document uploadDocument(Long projectId, String currentUserEmail, MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file was provided");
        }

        Project project = getProjectOrThrow(projectId);
        User uploader = getUserByEmail(currentUserEmail);
        assertProjectAccess(project, uploader);

        String originalFileName = sanitizeFileName(file.getOriginalFilename());
        String extension = extractExtension(originalFileName);
        String category = EXTENSION_CATEGORIES.get(extension);

        if (category == null) {
            throw new BadRequestException("Unsupported file type: ." + extension);
        }

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }

        String storageKey = "projects/" + projectId + "/" + UUID.randomUUID() + "_" + originalFileName;
        storageService.upload(file, storageKey, contentType);

        Document document = new Document();
        document.setProject(project);
        document.setUploadedBy(uploader);
        document.setOriginalFileName(originalFileName);
        document.setStorageKey(storageKey);
        document.setContentType(contentType);
        document.setFileSize(file.getSize());
        document.setFileCategory(category);

        return documentRepository.save(document);
    }

    // Any project owner or member can list.
    public List<Document> listDocuments(Long projectId, String currentUserEmail) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);
        assertProjectAccess(project, requester);

        return documentRepository.findByProject_IdOrderByCreatedAtDesc(projectId);
    }

    // Same access rule as listDocuments; an empty/blank query just returns every
    // document in the project (equivalent to list), so the frontend can reuse
    // this one endpoint for both "browse" and "search".
    public List<Document> searchDocuments(Long projectId, String currentUserEmail, String query) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);
        assertProjectAccess(project, requester);

        if (query == null || query.isBlank()) {
            return documentRepository.findByProject_IdOrderByCreatedAtDesc(projectId);
        }

        return documentRepository.findByProject_IdAndOriginalFileNameContainingIgnoreCaseOrderByCreatedAtDesc(
                projectId, query.trim());
    }

    // Used for both the metadata endpoint and to look up the storage key before
    // streaming a download.
    public Document getDocument(Long projectId, Long documentId, String currentUserEmail) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);
        assertProjectAccess(project, requester);

        return documentRepository.findByIdAndProject_Id(documentId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
    }

    // Only the person who uploaded the file, or the project owner, can delete it.
    public void deleteDocument(Long projectId, Long documentId, String currentUserEmail) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);
        Document document = documentRepository.findByIdAndProject_Id(documentId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        boolean isOwner = project.getOwner().getId().equals(requester.getId());
        boolean isUploader = document.getUploadedBy().getId().equals(requester.getId());

        if (!isOwner && !isUploader) {
            throw new ForbiddenActionException("Only the uploader or the project owner can delete this document");
        }

        storageService.delete(document.getStorageKey());
        documentRepository.delete(document);
    }

    private void assertProjectAccess(Project project, User user) {

        boolean isOwner = project.getOwner().getId().equals(user.getId());
        boolean isMember = projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), user.getId());

        if (!isOwner && !isMember) {
            throw new ForbiddenActionException("You do not have access to this project");
        }
    }

    private String sanitizeFileName(String fileName) {

        if (fileName == null || fileName.isBlank()) {
            throw new BadRequestException("File name is missing");
        }

        // Keep only the actual file name, in case a browser sends a full path,
        // then strip anything that isn't safe to use in a storage key.
        String name = Paths.get(fileName).getFileName().toString();
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String extractExtension(String fileName) {

        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            throw new BadRequestException("File must have a valid extension");
        }

        return fileName.substring(dotIndex + 1).toLowerCase();
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
    }

    private static Map<String, String> buildExtensionCategories() {

        Map<String, String> map = new HashMap<>();

        for (String ext : List.of("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "md", "txt")) {
            map.put(ext, "DOCUMENT");
        }
        for (String ext : List.of("jpg", "jpeg", "png", "gif", "svg", "bmp")) {
            map.put(ext, "IMAGE");
        }
        for (String ext : List.of("mp4", "mov", "avi")) {
            map.put(ext, "VIDEO");
        }

        return Collections.unmodifiableMap(map);
    }
}
