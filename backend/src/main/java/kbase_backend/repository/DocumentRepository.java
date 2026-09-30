package kbase_backend.repository;

import kbase_backend.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByProject_IdOrderByCreatedAtDesc(Long projectId);

    // Scopes the lookup to the project so a documentId can't be used to reach a
    // file that belongs to a different project.
    Optional<Document> findByIdAndProject_Id(Long id, Long projectId);

    // Case-insensitive "contains" search on the original file name, scoped to a
    // project - backs the document search feature.
    List<Document> findByProject_IdAndOriginalFileNameContainingIgnoreCaseOrderByCreatedAtDesc(
            Long projectId, String query);

    // Used by AdminService before deleting a user: Document.uploadedBy is a NOT
    // NULL FK, so a user who has uploaded files can't be deleted outright.
    boolean existsByUploadedBy_Id(Long userId);

    List<Document> findAllByOrderByCreatedAtDesc();
}
