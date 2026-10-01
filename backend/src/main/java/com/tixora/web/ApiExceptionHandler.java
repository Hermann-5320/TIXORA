package com.tixora.web;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  private static ResponseEntity<Map<String, String>> body(HttpStatus status, String message) {
    return ResponseEntity.status(status).body(Map.of("message", message));
  }

  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, String>> api(ApiException e) {
    return body(e.status, e.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
    var err = e.getBindingResult().getFieldError();
    return body(HttpStatus.BAD_REQUEST, err == null ? "Donnees invalides" : err.getField() + " : " + err.getDefaultMessage());
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<Map<String, String>> unreadable(HttpMessageNotReadableException e) {
    return body(HttpStatus.BAD_REQUEST, "Requete illisible");
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<Map<String, String>> tooLarge(MaxUploadSizeExceededException e) {
    return body(HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop lourd (3 Mo maximum)");
  }

  @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class,
      MissingServletRequestPartException.class})
  ResponseEntity<Map<String, String>> badRequest(Exception e) {
    return body(HttpStatus.BAD_REQUEST, "Parametre invalide ou manquant");
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, String>> other(Exception e) {
    log.error("Erreur non geree", e);
    return body(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne du serveur");
  }
}
