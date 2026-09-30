package kbase_backend.repository;

import kbase_backend.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    // A user can "see" a project either as its owner or as an invited member.
    @Query("""
            SELECT DISTINCT p FROM Project p
            LEFT JOIN ProjectMember pm ON pm.project = p
            WHERE p.owner.id = :userId OR pm.user.id = :userId
            ORDER BY p.createdAt DESC
            """)
    List<Project> findAllAccessibleByUser(@Param("userId") Long userId);

    // Used by AdminService before deleting a user: an owner must transfer or
    // delete their projects first, since Project.owner is a NOT NULL FK.
    boolean existsByOwner_Id(Long ownerId);

    // Admin-only: every project in the system, regardless of who owns it.
    List<Project> findAllByOrderByCreatedAtDesc();
}