package com.sim.repository;

import com.sim.model.BlogPost;
import com.sim.model.BlogPostCategory;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface BlogPostRepository extends MongoRepository<BlogPost, String> {
    List<BlogPost> findByCategory(BlogPostCategory category);
    List<BlogPost> findByAuthorId(String authorId);
    List<BlogPost> findAllByOrderByCreatedAtDesc();
    List<BlogPost> findByCategoryOrderByCreatedAtDesc(BlogPostCategory category);
    List<BlogPost> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCaseOrderByCreatedAtDesc(String title, String content);
    List<BlogPost> findByCategoryAndTitleContainingIgnoreCaseOrCategoryAndContentContainingIgnoreCaseOrderByCreatedAtDesc(
            BlogPostCategory category1, String title,
            BlogPostCategory category2, String content
    );
}
