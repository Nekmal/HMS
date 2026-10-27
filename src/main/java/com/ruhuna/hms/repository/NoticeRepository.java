package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Notice;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * Notice Bulletin Board Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements pure parameterized SQL queries for administrative announcements.
 * ============================================================================
 */
@Repository
public class NoticeRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public NoticeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Notice> noticeRowMapper = (rs, rowNum) -> {
        Notice notice = new Notice();
        notice.setId(rs.getLong("id"));
        notice.setTitle(rs.getString("title"));
        notice.setContent(rs.getString("content"));

        Date dDate = rs.getDate("date_posted");
        if (dDate != null) {
            notice.setDatePosted(dDate.toLocalDate());
        }

        notice.setTargetAudience(rs.getString("target_audience"));
        return notice;
    };

    public List<Notice> findAll() {
        return findAllByOrderByDatePostedDesc();
    }

    public List<Notice> findAllByOrderByDatePostedDesc() {
        String sql = "SELECT id, title, content, date_posted, target_audience FROM notices ORDER BY date_posted DESC, id DESC";
        return jdbcTemplate.query(sql, noticeRowMapper);
    }

    public Optional<Notice> findById(Long id) {
        String sql = "SELECT id, title, content, date_posted, target_audience FROM notices WHERE id = ?";
        try {
            Notice notice = jdbcTemplate.queryForObject(sql, noticeRowMapper, id);
            return Optional.ofNullable(notice);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Notice save(Notice notice) {
        Date pDate = (notice.getDatePosted() != null) ? Date.valueOf(notice.getDatePosted()) : Date.valueOf(java.time.LocalDate.now());

        if (notice.getId() == null) {
            String sql = "INSERT INTO notices (title, content, date_posted, target_audience) VALUES (?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, notice.getTitle());
                ps.setString(2, notice.getContent());
                ps.setDate(3, pDate);
                ps.setString(4, notice.getTargetAudience() != null ? notice.getTargetAudience() : "ALL");
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                notice.setId(keyHolder.getKey().longValue());
            }
            return notice;
        } else {
            String sql = "UPDATE notices SET title = ?, content = ?, date_posted = ?, target_audience = ? WHERE id = ?";
            jdbcTemplate.update(sql,
                    notice.getTitle(),
                    notice.getContent(),
                    pDate,
                    notice.getTargetAudience(),
                    notice.getId()
            );
            return notice;
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM notices WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }
}
