package com.tixora.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageDto<T>(List<T> items, long total, int page, int size, boolean last) {
  public static <T> PageDto<T> of(Page<?> page, List<T> items) {
    return new PageDto<>(items, page.getTotalElements(), page.getNumber(), page.getSize(), page.isLast());
  }
}
