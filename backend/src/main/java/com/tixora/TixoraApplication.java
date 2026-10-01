package com.tixora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class TixoraApplication {
  public static void main(String[] args) {
    SpringApplication.run(TixoraApplication.class, args);
  }
}
