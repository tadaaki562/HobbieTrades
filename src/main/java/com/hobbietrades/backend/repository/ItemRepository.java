package com.hobbietrades.backend.repository;

import com.hobbietrades.backend.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
    List<Item> findByIsAvailableTrue();
    List<Item> findByCategory(String category);
    List<Item> findByUserId(Long userId);
    List<Item> findByTitleContainingIgnoreCaseAndIsAvailableTrue(String title);
    List<Item> findByCategoryAndIsAvailableTrue(String category);
}