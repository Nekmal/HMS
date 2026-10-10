package com.ruhuna.hms;

import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.repository.UserRepository;
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
	public CommandLineRunner createDefaultAdmin(UserRepository userRepository) {
		return args -> {
			if (userRepository.findByStudentId("admin") == null) {
				User admin = new User();
				admin.setStudentId("admin");
				admin.setFullName("System Admin");
				admin.setPassword("admin123");
				admin.setRole("ADMIN");
				userRepository.save(admin);
				System.out.println("Default admin user created: admin / admin123");
			}
		};
	}
}
