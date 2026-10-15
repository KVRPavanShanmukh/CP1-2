package com.sim.controller;

import com.sim.model.BlogPost;
import com.sim.model.BlogPostCategory;
import com.sim.model.User;
import com.sim.service.AuthHelper;
import com.sim.service.BlogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/blog")
public class BlogController {

    @Autowired
    private BlogService blogService;

    @Autowired
    private AuthHelper authHelper;

    /**
     * GET /api/blog/posts
     * Optional query params: category, search
     */
    @GetMapping("/posts")
    public ResponseEntity<?> getPosts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            HttpServletRequest request
    ) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        BlogPostCategory cat = null;
        if (category != null && !category.trim().isEmpty()) {
            try {
                cat = BlogPostCategory.valueOf(category.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid category: " + category));
            }
        }

        List<BlogPost> posts;
        if (search != null && !search.trim().isEmpty()) {
            posts = blogService.searchPosts(search, cat);
        } else if (cat != null) {
            posts = blogService.getPostsByCategory(cat);
        } else {
            posts = blogService.getAllPosts();
        }

        return ResponseEntity.ok(Map.of("posts", posts));
    }

    /**
     * GET /api/blog/posts/{id}
     */
    @GetMapping("/posts/{id}")
    public ResponseEntity<?> getPost(@PathVariable String id, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        Optional<BlogPost> postOpt = blogService.getPostById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Post not found."));
        }

        return ResponseEntity.ok(Map.of("post", postOpt.get()));
    }

    /**
     * POST /api/blog/posts
     * Body: { title, content, category, tags? }
     * Author identity is resolved exclusively from the server session.
     */
    @SuppressWarnings("unchecked")
    @PostMapping("/posts")
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String categoryStr = (String) body.get("category");

        if (categoryStr == null || categoryStr.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Category is required."));
        }

        BlogPostCategory category;
        try {
            category = BlogPostCategory.valueOf(categoryStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid category: " + categoryStr));
        }

        List<String> tags = null;
        Object tagsObj = body.get("tags");
        if (tagsObj instanceof List) {
            tags = (List<String>) tagsObj;
        }

        try {
            BlogPost post = blogService.createPost(userOpt.get(), title, content, category, tags);
            return ResponseEntity.ok(Map.of("success", true, "post", post));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/blog/categories
     */
    @GetMapping("/categories")
    public ResponseEntity<?> getCategories(HttpServletRequest request) {
        Optional<User> userOpt = authHelper.getAuthenticatedUser(request);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        return ResponseEntity.ok(Map.of("categories", BlogPostCategory.values()));
    }
}
