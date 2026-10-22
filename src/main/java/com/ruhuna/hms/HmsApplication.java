package com.ruhuna.hms;

import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * ============================================================================
 * University of Ruhuna - Hostel Management System (HMS)
 * ============================================================================
 * Main Spring Boot Application Bootstrapper and Context Entry Point.
 * 
 * Architecture Overview:
 * - Framework: Spring Boot 4.1.1 / Spring 6.x
 * - Persistence: Spring Data JPA with Hibernate ORM 7.x
 * - Embedded Web Server: Apache Tomcat 11.x (Port: 8094, Context Path: /hms)
 * - Database Engine: MySQL / MariaDB (Database: hms_db)
 * - Layered Design: Controller -> Service -> Repository -> Entity -> MySQL
 *
 * Responsibilities:
 * 1. Initializes the Spring ApplicationContext and performs component scanning.
 * 2. Scans JPA repositories and entities in 'com.ruhuna.hms' package hierarchy.
 * 3. Executes CommandLineRunner beans to seed mandatory default administrative accounts.
 * ============================================================================
 */
@SpringBootApplication
public class HmsApplication {

	/**
	 * Application main entry method.
	 * Boots up Tomcat web server and registers REST endpoints and static web resources.
	 *
	 * @param args Standard command-line arguments passed at runtime.
	 */
	public static void main(String[] args) {
		SpringApplication.run(HmsApplication.class, args);
	}

	/**
	 * Seed Default Administrative Account:
	 * Automatically checks the database upon startup to see if the root 'admin' exists.
	 * If absent, it bootstraps the system with an initial Sub Warden administrator account.
	 *
	 * Default Credentials:
	 * - Username: admin
	 * - Password: admin123
	 * - Role: ADMIN (Sub Warden)
	 *
	 * @param userService Service layer bean used to query and persist user entities.
	 * @return CommandLineRunner callback that executes after the Spring context is fully initialized.
	 */
	@Bean
	public CommandLineRunner createDefaultAdmin(UserService userService) {
		return args -> {
			// Check whether the default administrator already exists in the resident directory
			if (userService.findByStudentId("admin") == null) {
				User admin = new User();
				admin.setStudentId("admin");
				admin.setFullName("System Admin");
				admin.setPassword("admin123");
				admin.setRole("ADMIN");
				
				// Persist administrator to MySQL users table
				userService.createUser(admin);
				System.out.println(">>> [HMS INITIALIZATION] Default admin account created: admin / admin123");
			}
		};
	}
}

