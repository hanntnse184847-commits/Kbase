package kbase_backend.service;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import kbase_backend.exception.StorageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

// Thin wrapper around the MinIO client: it only knows about raw bytes and
// object keys, and has no idea what a "project" or "document" is. All access
// control and metadata (original file name, category, etc.) lives in
// DocumentService/Document instead.
@Service
public class StorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    public StorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public void upload(MultipartFile file, String objectKey, String contentType) {
        try (InputStream inputStream = file.getInputStream()) {

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .stream(inputStream, file.getSize(), -1)
                    .contentType(contentType)
                    .build());

        } catch (Exception e) {
            throw new StorageException("Failed to upload file to storage", e);
        }
    }

    // Caller is responsible for closing the returned stream.
    public InputStream download(String objectKey) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
        } catch (Exception e) {
            throw new StorageException("Failed to download file from storage", e);
        }
    }

    public void delete(String objectKey) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
        } catch (Exception e) {
            throw new StorageException("Failed to delete file from storage", e);
        }
    }
}
