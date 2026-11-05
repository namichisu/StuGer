// Student Portal Logic

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Session Security Check (Student Role Required)
  let currentUser = null;
  try {
    const session = sessionStorage.getItem('stuger_user') || sessionStorage.getItem('edupulse_user');
    if (!session) {
      window.location.replace('index.html');
      return;
    }
    currentUser = JSON.parse(session);
    if (currentUser.role !== 'student') {
      window.location.replace('admin.html');
      return;
    }
  } catch (err) {
    sessionStorage.removeItem('stuger_user');
    sessionStorage.removeItem('edupulse_user');
    window.location.replace('index.html');
    return;
  }

  // DOM Elements
  const userDisplayName = document.getElementById('userDisplayName');
  const btnLogout = document.getElementById('btnLogout');
  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const systemStatusText = document.getElementById('systemStatusText');
  const studentPortalDetails = document.getElementById('studentPortalDetails');
  const toastContainer = document.getElementById('toastContainer');

  // Toast Helper
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // Helpers
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getInitials(first, last) {
    const f = first ? first.charAt(0).toUpperCase() : '';
    const l = last ? last.charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'ST';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const cleanDate = String(dateStr).split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, monthIndex, day);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      return cleanDate;
    } catch {
      return dateStr;
    }
  }

  function getGpaClass(gpa) {
    const val = parseFloat(gpa);
    if (isNaN(val)) return 'gpa-mid';
    if (val >= 3.5) return 'gpa-high';
    if (val >= 3.0) return 'gpa-mid';
    return 'gpa-low';
  }

  function getStatusClass(status) {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Inactive': return 'status-inactive';
      case 'Graduated': return 'status-graduated';
      case 'Suspended': return 'status-suspended';
      default: return 'status-inactive';
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied "${text}"`, 'info');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(`Copied "${text}"`, 'info');
  }

  // Logout
  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('stuger_user');
    sessionStorage.removeItem('edupulse_user');
    window.location.replace('index.html');
  });

  // System Health
  async function checkSystemHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        systemStatusBadge.classList.remove('status-offline');
        systemStatusText.textContent = 'Online';
      } else {
        systemStatusBadge.classList.add('status-offline');
        systemStatusText.textContent = 'Server Busy';
      }
    } catch {
      systemStatusBadge.classList.add('status-offline');
      systemStatusText.textContent = 'Offline';
    }
  }

  // Load & Render Student Profile
  async function loadStudentProfile() {
    let student = currentUser.student;

    if (!student && currentUser.student_id) {
      try {
        const res = await fetch(`/api/auth/student/${currentUser.student_id}`);
        const json = await res.json();
        if (json.success && json.data) {
          student = json.data;
          currentUser.student = student;
          sessionStorage.setItem('stuger_user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.error('Error fetching student record:', err);
      }
    }

    if (!student) {
      studentPortalDetails.innerHTML = `
        <div class="table-state-box">
          <h3>No Student Record Linked</h3>
          <p>Your account (${currentUser.username}) is not yet linked to an active student record in the database.</p>
        </div>
      `;
      return;
    }

    const studentFullName = `${student.first_name} ${student.last_name}`;
    userDisplayName.textContent = `Signed in as ${studentFullName}`;

    const initials = getInitials(student.first_name, student.last_name);
    const gpaClass = getGpaClass(student.gpa);
    const statusClass = getStatusClass(student.status);

    studentPortalDetails.innerHTML = `
      <div class="profile-hero">
        <div class="hero-avatar">${initials}</div>
        <div class="hero-info">
          <h3>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</h3>
          <div class="hero-subtags">
            <span class="id-pill" data-copy="${escapeHtml(student.student_id)}" style="cursor: pointer;" title="Click to copy">
              ${escapeHtml(student.student_id)}
            </span>
            <span>•</span>
            <span>${escapeHtml(student.course)}</span>
          </div>
        </div>
      </div>

      <div class="details-grid" style="margin-top: 1rem;">
        <div class="detail-tile">
          <span class="tile-label">Student ID</span>
          <span class="tile-value">${escapeHtml(student.student_id)}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Academic Status</span>
          <div>
            <span class="status-pill ${statusClass}">
              <span class="status-dot-inner"></span>
              <span>${escapeHtml(student.status)}</span>
            </span>
          </div>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Email Address</span>
          <span class="tile-value">${escapeHtml(student.email)}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Phone Number</span>
          <span class="tile-value">${escapeHtml(student.phone) || 'Not provided'}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Course / Department</span>
          <span class="tile-value">${escapeHtml(student.course)}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Cumulative GPA</span>
          <div>
            <span class="gpa-chip ${gpaClass}">${parseFloat(student.gpa || 0).toFixed(2)} / 4.00</span>
          </div>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Enrollment Date</span>
          <span class="tile-value">${formatDate(student.enrollment_date)}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Date of Birth</span>
          <span class="tile-value">${formatDate(student.dob)}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Gender</span>
          <span class="tile-value">${escapeHtml(student.gender)}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Registration Record</span>
          <span class="tile-value">${student.created_at ? formatDate(student.created_at) : 'N/A'}</span>
        </div>
        <div class="detail-tile span-all">
          <span class="tile-label">Residential Address</span>
          <span class="tile-value">${escapeHtml(student.address) || 'No residential address on file.'}</span>
        </div>
      </div>
    `;
  }

  studentPortalDetails.addEventListener('click', (e) => {
    const copyTarget = e.target.closest('[data-copy]');
    if (copyTarget) {
      copyToClipboard(copyTarget.dataset.copy);
    }
  });

  // Initial Boot
  checkSystemHealth();
  loadStudentProfile();
});

