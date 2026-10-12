package com.ruhuna.hms;

import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class HmsApplication {

	public static void main(String[] args) {
		SpringApplication.run(HmsApplication.class, args);
	}

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
