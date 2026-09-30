package kbase_backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleNotFound(ResourceNotFoundException e) {
        return build(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(ForbiddenActionException.class)
    public ResponseEntity<Object> handleForbidden(ForbiddenActionException e) {
        return build(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Object> handleConflict(ConflictException e) {
        return build(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Object> handleBadRequest(BadRequestException e) {
        return build(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    // Object storage (MinIO) failures are an infrastructure problem, not bad
    // client input, so they get their own handler instead of falling through to
    // the generic RuntimeException -> 400 mapping below.
    @ExceptionHandler(StorageException.class)
    public ResponseEntity<Object> handleStorage(StorageException e) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }

    // Catches validation failures from @Valid @RequestBody (e.g. blank name,
    // invalid email).
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("Invalid request body");
        return build(HttpStatus.BAD_REQUEST, message);
    }

    // Fallback: any other RuntimeException (e.g. the existing "Invalid email or
    // password",
    // "Email already exists") becomes a 400 with a JSON body instead of the default
    // Whitelabel 500 error page.
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Object> handleGeneric(RuntimeException e) {
        return build(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    private ResponseEntity<Object> build(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}