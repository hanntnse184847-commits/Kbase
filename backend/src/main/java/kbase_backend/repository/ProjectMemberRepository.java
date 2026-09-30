package kbase_backend.repository;

import kbase_backend.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    List<ProjectMember> findByProject_Id(Long projectId);

    boolean existsByProject_IdAndUser_Id(Long projectId, Long userId);

    // Used when the owner removes a specific member from a project.
    Optional<ProjectMember> findByProject_IdAndUser_Id(Long projectId, Long userId);

    // Used by AdminService when deleting a user: clears their memberships first
    // so the delete doesn't fail on the ProjectMember -> User foreign key.
    void deleteByUser_Id(Long userId);

    // Used by AdminService when deleting a project outright (admin override):
    // memberships must go before the project row itself.
    void deleteByProject_Id(Long projectId);
}
