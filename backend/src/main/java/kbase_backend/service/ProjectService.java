package kbase_backend.service;

import kbase_backend.dto.CreateProjectRequest;
import kbase_backend.dto.InviteMemberRequest;
import kbase_backend.dto.UpdateProjectRequest;
import kbase_backend.entity.Document;
import kbase_backend.entity.Project;
import kbase_backend.entity.ProjectMember;
import kbase_backend.entity.User;
import kbase_backend.exception.BadRequestException;
import kbase_backend.exception.ConflictException;
import kbase_backend.exception.ForbiddenActionException;
import kbase_backend.exception.ResourceNotFoundException;
import kbase_backend.repository.DocumentRepository;
import kbase_backend.repository.ProjectMemberRepository;
import kbase_backend.repository.ProjectRepository;
import kbase_backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;

    public ProjectService(
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            UserRepository userRepository,
            DocumentRepository documentRepository,
            StorageService storageService) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
    }

    public Project createProject(String currentUserEmail, CreateProjectRequest request) {

        User owner = getUserByEmail(currentUserEmail);

        if (!"OWNER".equals(owner.getRole())) {
            throw new ForbiddenActionException("Only users with role OWNER can create projects");
        }

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setOwner(owner);

        return projectRepository.save(project);
    }

    public List<Project> listProjectsForUser(String currentUserEmail) {

        User user = getUserByEmail(currentUserEmail);
        return projectRepository.findAllAccessibleByUser(user.getId());
    }

    public ProjectMember inviteMember(Long projectId, String currentUserEmail, InviteMemberRequest request) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);

        if (!project.getOwner().getId().equals(requester.getId())) {
            throw new ForbiddenActionException("Only the project owner can invite members");
        }

        User invitedUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getEmail()));

        if (invitedUser.getId().equals(project.getOwner().getId())) {
            throw new ConflictException("This user is already the project owner");
        }

        if (projectMemberRepository.existsByProject_IdAndUser_Id(projectId, invitedUser.getId())) {
            throw new ConflictException("This user is already a member of the project");
        }

        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(invitedUser);
        member.setRole("MEMBER");

        return projectMemberRepository.save(member);
    }

    public List<ProjectMember> listMembers(Long projectId, String currentUserEmail) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);

        boolean isOwner = project.getOwner().getId().equals(requester.getId());
        boolean isMember = projectMemberRepository.existsByProject_IdAndUser_Id(projectId, requester.getId());

        if (!isOwner && !isMember) {
            throw new ForbiddenActionException("You do not have access to this project");
        }

        return projectMemberRepository.findByProject_Id(projectId);
    }

    public Project getProjectDetail(Long projectId, String currentUserEmail) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);

        boolean isOwner = project.getOwner().getId().equals(requester.getId());
        boolean isMember = projectMemberRepository.existsByProject_IdAndUser_Id(projectId, requester.getId());

        if (!isOwner && !isMember) {
            throw new ForbiddenActionException("You do not have access to this project");
        }

        return project;
    }

    public void removeMember(Long projectId, Long memberUserId, String currentUserEmail) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);

        if (!project.getOwner().getId().equals(requester.getId())) {
            throw new ForbiddenActionException("Only the project owner can remove members");
        }

        ProjectMember member = projectMemberRepository.findByProject_IdAndUser_Id(projectId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("This user is not a member of the project"));

        projectMemberRepository.delete(member);
    }

    /** Chỉ owner của project mới được sửa */
    public Project updateProject(Long projectId, String currentUserEmail, UpdateProjectRequest request) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);

        if (!project.getOwner().getId().equals(requester.getId())) {
            throw new ForbiddenActionException("Only the project owner can update this project");
        }

        if (request.getName() == null || request.getName().isBlank()) {
            throw new BadRequestException("Project name cannot be empty");
        }

        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());

        return projectRepository.save(project);
    }

    /** Chỉ owner của project mới được xóa (xóa luôn documents + members) */
    public void deleteProject(Long projectId, String currentUserEmail) {

        Project project = getProjectOrThrow(projectId);
        User requester = getUserByEmail(currentUserEmail);

        if (!project.getOwner().getId().equals(requester.getId())) {
            throw new ForbiddenActionException("Only the project owner can delete this project");
        }

        List<Document> documents = documentRepository.findByProject_IdOrderByCreatedAtDesc(projectId);
        for (Document document : documents) {
            storageService.delete(document.getStorageKey());
        }
        documentRepository.deleteAll(documents);

        projectMemberRepository.deleteByProject_Id(projectId);
        projectRepository.delete(project);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
    }
}