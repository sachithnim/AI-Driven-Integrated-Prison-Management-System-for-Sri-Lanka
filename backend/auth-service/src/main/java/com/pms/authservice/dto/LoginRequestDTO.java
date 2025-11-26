package com.pms.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LoginRequestDTO {
  @NotBlank(message = "Username is required")
  private String username;

  @NotBlank(message = "Password is required")
  @Size(min = 8, message = "Password must be at least 8 characters long")
  private String password;

  public @NotBlank(message = "Username is required") String getUsername() {
    return username;
  }

  public void setUsername(
      @NotBlank(message = "Username is required") String username) {
    this.username = username;
  }

  public @NotBlank(message = "Password is required") @Size(min = 8, message = "Password must be at least 8 characters long") String getPassword() {
    return password;
  }

  public void setPassword(
      @NotBlank(message = "Password is required") @Size(min = 8, message = "Password must be at least 8 characters long") String password) {
    this.password = password;
  }
}
