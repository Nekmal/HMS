package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Complaint;
import java.util.List;

public interface ComplaintService {
    List<Complaint> getAllComplaints();
    List<Complaint> getComplaintsByUserId(Long userId);
    Complaint createComplaint(Complaint complaint);
    Complaint resolveComplaint(Long id);
}
