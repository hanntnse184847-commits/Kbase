package kbase_backend.dto;

import java.util.List;

// Used by the admin "view project" endpoint: the project plus its full member
// list in one response, so the admin UI doesn't need two separate calls.
public class ProjectDetailResponse {

    private ProjectResponse project;
    private List<ProjectMemberResponse> members;

    public ProjectDetailResponse(ProjectResponse project, List<ProjectMemberResponse> members) {
        this.project = project;
        this.members = members;
    }

    public ProjectResponse getProject() {
        return project;
    }

    public List<ProjectMemberResponse> getMembers() {
        return members;
    }
}
