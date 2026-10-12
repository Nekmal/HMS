package com.ruhuna.hms;

import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Main Spring Boot entry point for University of Ruhuna Hostel Management System.
 */
@SpringBootApplication
public class HmsApplication {

	// Launches the Spring Boot application context
	public static void main(String[] args) {
		SpringApplication.run(HmsApplication.class, args);
	}

	// Seeds the default administrator account upon initial startup if absent
	@Bean
	public CommandLineRunner createDefaultAdmin(UserService userService) {
		return args -> {
			if (userService.findByStudentId("admin") == null) {
				User admin = new User();
				admin.setStudentId("admin");
				admin.setFullName("System Admin");
				admin.setPassword("admin123");
				admin.setRole("ADMIN");
				userService.createUser(admin);
				System.out.println("Default admin user created: admin / admin123");
			}
		};
	}
}
