package kbase_backend.dto;

// All fields are optional (partial update): the admin only sends the fields
// they actually want to change. No @NotBlank here on purpose - a blank/absent
// field just means "leave this one alone" (see AdminService.updateUser).
public class UpdateUserRequest {

    private String name;
    private String email;
    private String password; // if provided, resets the password
    private String role; // if provided, must be USER, OWNER, or ADMIN

    public UpdateUserRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
