package kbase_backend.controller;

import jakarta.validation.Valid;
import kbase_backend.dto.CreateProjectRequest;
import kbase_backend.dto.InviteMemberRequest;
import kbase_backend.dto.ProjectMemberResponse;
import kbase_backend.dto.ProjectResponse;
import kbase_backend.dto.UpdateProjectRequest;
import kbase_backend.entity.Project;
import kbase_backend.entity.ProjectMember;
import kbase_backend.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    // Only users whose global role is OWNER can create a project (enforced in the
    // service).
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication) {

        Project project = projectService.createProject(authentication.getName(), request);
        return toResponse(project);
    }

    // Projects the current user owns OR has been invited to.
    @GetMapping
    public List<ProjectResponse> listMyProjects(Authentication authentication) {

        return projectService.listProjectsForUser(authentication.getName())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Single project - visible to its owner and to any of its members.
    @GetMapping("/{projectId}")
    public ProjectResponse getProject(
            @PathVariable Long projectId,
            Authentication authentication) {

        return toResponse(projectService.getProjectDetail(projectId, authentication.getName()));
    }

    // Only the project's owner can invite. The invited user must already have an
    // account.
    @PostMapping("/{projectId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectMemberResponse inviteMember(
            @PathVariable Long projectId,
            @Valid @RequestBody InviteMemberRequest request,
            Authentication authentication) {

        ProjectMember member = projectService.inviteMember(projectId, authentication.getName(), request);
        return toResponse(member);
    }

    // Visible to the owner and to any member of the project.
    @GetMapping("/{projectId}/members")
    public List<ProjectMemberResponse> listMembers(
            @PathVariable Long projectId,
            Authentication authentication) {

        return projectService.listMembers(projectId, authentication.getName())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Only the project's owner can remove a member.
    @DeleteMapping("/{projectId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @PathVariable Long projectId,
            @PathVariable Long userId,
            Authentication authentication) {

        projectService.removeMember(projectId, userId, authentication.getName());
    }

    // Chỉ owner của project mới sửa được
    @PutMapping("/{projectId}")
    public ProjectResponse updateProject(
            @PathVariable Long projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            Authentication authentication) {

        Project project = projectService.updateProject(projectId, authentication.getName(), request);
        return toResponse(project);
    }

    // Chỉ owner của project mới xóa được
    @DeleteMapping("/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(
            @PathVariable Long projectId,
            Authentication authentication) {

        projectService.deleteProject(projectId, authentication.getName());
    }

    private ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getOwner().getId(),
                project.getOwner().getEmail(),
                project.getCreatedAt());
    }

    private ProjectMemberResponse toResponse(ProjectMember member) {
        return new ProjectMemberResponse(
                member.getUser().getId(),
                member.getUser().getName(),
                member.getUser().getEmail(),
                member.getRole(),
                member.getJoinedAt());
    }
}