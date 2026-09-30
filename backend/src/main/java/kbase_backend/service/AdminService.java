package kbase_backend.service;

import kbase_backend.dto.CreateUserRequest;
import kbase_backend.dto.UpdateUserRequest;
import kbase_backend.entity.Document;
import kbase_backend.entity.Project;
import kbase_backend.entity.ProjectMember;
import kbase_backend.entity.User;
import kbase_backend.exception.BadRequestException;
import kbase_backend.exception.ConflictException;
import kbase_backend.exception.ResourceNotFoundException;
import kbase_backend.repository.DocumentRepository;
import kbase_backend.repository.ProjectMemberRepository;
import kbase_backend.repository.ProjectRepository;
import kbase_backend.repository.UserRepository;
import kbase_backend.dto.AdminUpdateProjectRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

// Everything behind /api/admin - only reachable by ROLE_ADMIN (enforced in
// SecurityConfig). This service intentionally does NOT re-check the caller's
// role: by the time a request reaches here, Spring Security has already
// confirmed it.
@Service
public class AdminService {

    private static final Set<String> VALID_ROLES = Set.of("USER", "OWNER", "ADMIN");

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            DocumentRepository documentRepository,
            StorageService storageService,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.passwordEncoder = passwordEncoder;
    }

    // ------------------------------------------------------------------
    // Users
    // ------------------------------------------------------------------

    public List<User> listUsers() {
        return userRepository.findAll();
    }

    public User getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    // Unlike the public /api/auth/register (which always forces role = USER),
    // an admin can create a user with any role directly.
    public User createUser(CreateUserRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ConflictException("Email already exists");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(normalizeRole(request.getRole()));

        return userRepository.save(user);
    }

    // Partial update: only fields the admin actually sent are changed.
    public User updateUser(Long userId, UpdateUserRequest request) {

        User user = getUserOrThrow(userId);

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()
                && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new ConflictException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            user.setRole(normalizeRole(request.getRole()));
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return userRepository.save(user);
    }

    // Blocked if the user owns projects or has uploaded documents, since both
    // Project.owner and Document.uploadedBy are NOT NULL foreign keys - there is
    // no safe "orphan" state to leave those rows in. The admin has to delete or
    // reassign that data first, rather than have it silently cascade away.
    public void deleteUser(Long userId) {

        User user = getUserOrThrow(userId);

        if (projectRepository.existsByOwner_Id(userId)) {
            throw new ConflictException(
                    "Cannot delete this user: they own one or more projects. Delete those projects first.");
        }
        if (documentRepository.existsByUploadedBy_Id(userId)) {
            throw new ConflictException(
                    "Cannot delete this user: they have uploaded documents. Remove those documents first.");
        }

        projectMemberRepository.deleteByUser_Id(userId);
        userRepository.delete(user);
    }

    public User setUserEnabled(Long userId, boolean enabled) {
        User user = getUserOrThrow(userId);

        user.setEnabled(enabled);

        return userRepository.save(user);
    }

    private String normalizeRole(String role) {

        if (role == null || role.isBlank()) {
            return "USER";
        }

        String normalized = role.trim().toUpperCase();
        if (!VALID_ROLES.contains(normalized)) {
            throw new BadRequestException("Invalid role: " + role + ". Must be one of USER, OWNER, ADMIN.");
        }

        return normalized;
    }

    // ------------------------------------------------------------------
    // Projects
    // ------------------------------------------------------------------

    // Every project in the system, regardless of ownership - unlike
    // ProjectService.listProjectsForUser, which only returns what the caller
    // owns or was invited to.
    public List<Project> listAllProjects() {
        return projectRepository.findAllByOrderByCreatedAtDesc();
    }

    public Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
    }

    public List<ProjectMember> listProjectMembers(Long projectId) {
        getProjectOrThrow(projectId); // 404 if the project doesn't exist at all
        return projectMemberRepository.findByProject_Id(projectId);
    }

    // Full admin override: removes the project's documents (both the DB rows
    // and the actual files in MinIO), its memberships, then the project itself.
    // Unlike normal document/member deletion, this bypasses all ownership
    // checks - it's meant for admins cleaning up, not regular project use.
    public void deleteProject(Long projectId) {

        Project project = getProjectOrThrow(projectId);

        List<Document> documents = documentRepository.findByProject_IdOrderByCreatedAtDesc(projectId);
        for (Document document : documents) {
            storageService.delete(document.getStorageKey());
        }
        documentRepository.deleteAll(documents);

        projectMemberRepository.deleteByProject_Id(projectId);
        projectRepository.delete(project);
    }

    public Project updateProject(
            Long projectId,
            AdminUpdateProjectRequest request) {

        Project project = getProjectOrThrow(projectId);

        if (request.name() != null) {
            if (request.name().isBlank()) {
                throw new BadRequestException(
                        "Project name cannot be empty");
            }

            project.setName(request.name().trim());
        }

        if (request.description() != null) {
            project.setDescription(request.description());
        }

        return projectRepository.save(project);
    }

    public List<Document> listAllDocuments() {
        return documentRepository.findAllByOrderByCreatedAtDesc();
    }
}
