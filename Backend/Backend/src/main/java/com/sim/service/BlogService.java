package com.sim.service;

import com.sim.model.BlogPost;
import com.sim.model.BlogPostCategory;
import com.sim.model.User;
import com.sim.repository.BlogPostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class BlogService {

    @Autowired
    private BlogPostRepository blogPostRepository;

    private static final int MAX_TITLE_LENGTH = 200;
    private static final int MAX_CONTENT_LENGTH = 10000;
    private static final int MAX_TAGS = 10;
    private static final int MAX_TAG_LENGTH = 50;

    /**
     * Creates a blog post. Author identity is always derived from the
     * server-side authenticated user, never from client-supplied data.
     */
    public BlogPost createPost(User author, String title, String content,
                               BlogPostCategory category, List<String> tags) {
        // Validate title
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required.");
        }
        title = title.trim();
        if (title.length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("Title must not exceed " + MAX_TITLE_LENGTH + " characters.");
        }

        // Validate content
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Content is required.");
        }
        content = content.trim();
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("Content must not exceed " + MAX_CONTENT_LENGTH + " characters.");
        }

        // Validate category
        if (category == null) {
            throw new IllegalArgumentException("Category is required.");
        }

        // Validate and sanitize tags
        if (tags != null) {
            if (tags.size() > MAX_TAGS) {
                throw new IllegalArgumentException("Maximum of " + MAX_TAGS + " tags allowed.");
            }
            tags = tags.stream()
                    .filter(t -> t != null && !t.trim().isEmpty())
                    .map(t -> t.trim().length() > MAX_TAG_LENGTH ? t.trim().substring(0, MAX_TAG_LENGTH) : t.trim())
                    .toList();
        }

        BlogPost post = new BlogPost();
        post.setTitle(title);
        post.setContent(content);
        post.setCategory(category);
        post.setTags(tags != null ? tags : List.of());
        post.setAuthorId(author.getId());
        post.setAuthorUsername(author.getUsername());
        post.setCreatedAt(Instant.now());
        post.setUpdatedAt(Instant.now());

        return blogPostRepository.save(post);
    }

    public List<BlogPost> getAllPosts() {
        return blogPostRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<BlogPost> getPostById(String id) {
        return blogPostRepository.findById(id);
    }

    public List<BlogPost> getPostsByCategory(BlogPostCategory category) {
        return blogPostRepository.findByCategoryOrderByCreatedAtDesc(category);
    }

    public List<BlogPost> searchPosts(String query, BlogPostCategory category) {
        if (query == null || query.trim().isEmpty()) {
            if (category != null) {
                return getPostsByCategory(category);
            }
            return getAllPosts();
        }

        String trimmed = query.trim();
        if (category != null) {
            return blogPostRepository
                    .findByCategoryAndTitleContainingIgnoreCaseOrCategoryAndContentContainingIgnoreCaseOrderByCreatedAtDesc(
                            category, trimmed, category, trimmed);
        }

        return blogPostRepository
                .findByTitleContainingIgnoreCaseOrContentContainingIgnoreCaseOrderByCreatedAtDesc(trimmed, trimmed);
    }
}
