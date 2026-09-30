package kbase_backend.controller;

import jakarta.validation.Valid;
import kbase_backend.dto.CreateUserRequest;
import kbase_backend.dto.ProjectDetailResponse;
import kbase_backend.dto.ProjectMemberResponse;
import kbase_backend.dto.ProjectResponse;
import kbase_backend.dto.UpdateUserRequest;
import kbase_backend.dto.UserResponse;
import kbase_backend.entity.Project;
import kbase_backend.entity.ProjectMember;
import kbase_backend.entity.User;
import kbase_backend.service.AdminService;
import kbase_backend.dto.AdminUpdateProjectRequest;
import kbase_backend.dto.AdminDocumentResponse;
import kbase_backend.entity.Document;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Every endpoint here requires ROLE_ADMIN - enforced by SecurityConfig's
// ".requestMatchers(\"/api/admin/**\").hasRole(\"ADMIN\")", not by anything in
// this class. A non-admin JWT never even reaches these methods.
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ------------------------------------------------------------------
    // Users
    // ------------------------------------------------------------------

    @GetMapping("/users")
    public List<UserResponse> listUsers() {
        return adminService.listUsers().stream().map(this::toResponse).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return toResponse(adminService.createUser(request));
    }

    @PutMapping("/users/{userId}")
    public UserResponse updateUser(
            @PathVariable Long userId,
            @RequestBody UpdateUserRequest request) {
        return toResponse(adminService.updateUser(userId, request));
    }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long userId) {
        adminService.deleteUser(userId);
    }

    @PatchMapping("/users/{userId}/status")
    public UserResponse updateUserStatus(
            @PathVariable Long userId,
            @RequestParam boolean enabled) {

        return toResponse(
                adminService.setUserEnabled(userId, enabled));
    }

    // ------------------------------------------------------------------
    // Projects
    // ------------------------------------------------------------------

    // Every project in the system, regardless of owner - contrast with
    // GET /api/projects, which only returns the caller's own/invited projects.
    @GetMapping("/projects")
    public List<ProjectResponse> listAllProjects() {
        return adminService.listAllProjects().stream().map(this::toProjectResponse).toList();
    }

    @GetMapping("/projects/{projectId}")
    public ProjectDetailResponse getProject(@PathVariable Long projectId) {

        Project project = adminService.getProjectOrThrow(projectId);
        List<ProjectMemberResponse> members = adminService.listProjectMembers(projectId).stream()
                .map(this::toMemberResponse)
                .toList();

        return new ProjectDetailResponse(toProjectResponse(project), members);
    }

    @PutMapping("/projects/{projectId}")
    public ProjectResponse updateProject(
            @PathVariable Long projectId,
            @RequestBody AdminUpdateProjectRequest request) {

        return toProjectResponse(
                adminService.updateProject(projectId, request));
    }

    // Deletes the project outright: its documents (DB + MinIO), memberships,
    // then the project row. No ownership check - this is an admin override.
    @DeleteMapping("/projects/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(@PathVariable Long projectId) {
        adminService.deleteProject(projectId);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled());
    }

    private ProjectResponse toProjectResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getOwner().getId(),
                project.getOwner().getEmail(),
                project.getCreatedAt());
    }

    private ProjectMemberResponse toMemberResponse(ProjectMember member) {
        return new ProjectMemberResponse(
                member.getUser().getId(),
                member.getUser().getName(),
                member.getUser().getEmail(),
                member.getRole(),
                member.getJoinedAt());
    }

    @GetMapping("/documents")
    public List<AdminDocumentResponse> listAllDocuments() {
        return adminService.listAllDocuments()
                .stream()
                .map(this::toAdminDocumentResponse)
                .toList();
    }

    private AdminDocumentResponse toAdminDocumentResponse(
            Document document) {

        return new AdminDocumentResponse(
                document.getId(),
                document.getProject().getId(),
                document.getProject().getName(),
                document.getProject().getOwner().getEmail(),
                document.getOriginalFileName(),
                document.getContentType(),
                document.getFileSize(),
                document.getFileCategory(),
                document.getUploadedBy().getId(),
                document.getUploadedBy().getName(),
                document.getCreatedAt());
    }
}
