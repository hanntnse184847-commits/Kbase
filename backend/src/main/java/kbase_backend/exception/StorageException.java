package kbase_backend.exception;

// Thrown when talking to the object storage backend (MinIO) fails - e.g. the
// server is unreachable, or a bucket/object operation errors out. This is an
// infrastructure problem, not bad client input, so it maps to 500 rather than
// the 400 that other RuntimeExceptions in this app get by default.
public class StorageException extends RuntimeException {
    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
