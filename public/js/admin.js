// Administrator Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
  'use strict';


  let currentUser = null;
  try {
    const session = sessionStorage.getItem('stuger_user') || sessionStorage.getItem('edupulse_user');
    if (!session) {
      window.location.replace('index.html');
      return;
    }
    currentUser = JSON.parse(session);
    if (currentUser.role !== 'admin') {
      window.location.replace('student.html');
      return;
    }
  } catch (err) {
    sessionStorage.removeItem('stuger_user');
    sessionStorage.removeItem('edupulse_user');
    window.location.replace('index.html');
    return;
  }


  const state = {
    students: [],
    courses: [],
    sortOrder: 'DESC',
    currentEditingId: null,
    studentToDelete: null,
    currentViewingStudent: null,
    searchDebounceTimer: null
  };


  const userDisplayName = document.getElementById('userDisplayName');
  const btnLogout = document.getElementById('btnLogout');
  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const systemStatusText = document.getElementById('systemStatusText');

  userDisplayName.textContent = `Signed in as ${currentUser.username}`;

  // Stats
  const statTotalStudents = document.getElementById('statTotalStudents');
  const statActiveStudents = document.getElementById('statActiveStudents');
  const activePercentPill = document.getElementById('activePercentPill');
  const statTotalCourses = document.getElementById('statTotalCourses');
  const statAverageGpa = document.getElementById('statAverageGpa');

  // Controls
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const courseFilter = document.getElementById('courseFilter');
  const statusFilter = document.getElementById('statusFilter');
  const sortBy = document.getElementById('sortBy');
  const btnToggleSortOrder = document.getElementById('btnToggleSortOrder');
  const sortOrderText = document.getElementById('sortOrderText');
  const btnRefresh = document.getElementById('btnRefresh');

  // Table
  const recordCountLabel = document.getElementById('recordCountLabel');
  const activeFilterPills = document.getElementById('activeFilterPills');
  const studentTableBody = document.getElementById('studentTableBody');
  const tableLoading = document.getElementById('tableLoading');
  const emptyState = document.getElementById('emptyState');
  const btnResetFilters = document.getElementById('btnResetFilters');

  // Modals & Forms
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');
  const studentModal = document.getElementById('studentModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const studentForm = document.getElementById('studentForm');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const studentPkId = document.getElementById('studentPkId');
  const btnSubmitStudent = document.getElementById('btnSubmitStudent');
  const btnSubmitText = document.getElementById('btnSubmitText');

  // Form Inputs
  const inputFirstName = document.getElementById('firstName');
  const inputLastName = document.getElementById('lastName');
  const inputEmail = document.getElementById('email');
  const inputPhone = document.getElementById('phone');
  const inputDob = document.getElementById('dob');
  const selectGender = document.getElementById('gender');
  const inputStudentId = document.getElementById('studentId');
  const selectStudentStatus = document.getElementById('studentStatus');
  const inputCourse = document.getElementById('course');
  const inputEnrollmentDate = document.getElementById('enrollmentDate');
  const inputGpa = document.getElementById('gpa');
  const inputAddress = document.getElementById('address');
  const courseSuggestions = document.getElementById('courseSuggestions');

  // View Modal
  const viewModal = document.getElementById('viewModal');
  const btnCloseViewModal = document.getElementById('btnCloseViewModal');
  const btnCloseViewBtn = document.getElementById('btnCloseViewBtn');
  const btnEditFromView = document.getElementById('btnEditFromView');
  const viewModalBody = document.getElementById('viewModalBody');

  // Delete Modal
  const deleteModal = document.getElementById('deleteModal');
  const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
  const btnCancelDelete = document.getElementById('btnCancelDelete');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');
  const deleteStudentName = document.getElementById('deleteStudentName');
  const deleteStudentCode = document.getElementById('deleteStudentCode');
  const deleteStudentCourse = document.getElementById('deleteStudentCourse');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');


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


  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('stuger_user');
    sessionStorage.removeItem('edupulse_user');
    window.location.replace('index.html');
  });


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


  async function fetchStats() {
    try {
      const res = await fetch('/api/students/stats');
      const json = await res.json();

      if (json.success && json.data) {
        const stats = json.data;
        statTotalStudents.textContent = stats.totalStudents || 0;
        statActiveStudents.textContent = stats.activeStudents || 0;
        statTotalCourses.textContent = stats.totalCourses || 0;
        statAverageGpa.textContent = parseFloat(stats.averageGpa || 0).toFixed(2);

        const total = stats.totalStudents || 0;
        const active = stats.activeStudents || 0;
        const percent = total > 0 ? Math.round((active / total) * 100) : 0;
        activePercentPill.textContent = `${percent}% active`;

        // Update Course Dropdown
        const currentSelectedCourse = courseFilter.value;
        courseFilter.innerHTML = '<option value="">All Courses</option>';
        if (Array.isArray(stats.courses)) {
          stats.courses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (c === currentSelectedCourse) opt.selected = true;
            courseFilter.appendChild(opt);
          });

          if (courseSuggestions) {
            courseSuggestions.innerHTML = '';
            stats.courses.forEach(c => {
              const opt = document.createElement('option');
              opt.value = c;
              courseSuggestions.appendChild(opt);
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load stats:', err);
    }
  }


  function updateFilterPills() {
    activeFilterPills.innerHTML = '';
    const search = searchInput.value.trim();
    const course = courseFilter.value;
    const status = statusFilter.value;

    if (search) {
      const pill = document.createElement('span');
      pill.className = 'filter-badge';
      pill.textContent = `Search: "${search}"`;
      activeFilterPills.appendChild(pill);
    }

    if (course) {
      const pill = document.createElement('span');
      pill.className = 'filter-badge';
      pill.textContent = `Course: ${course}`;
      activeFilterPills.appendChild(pill);
    }

    if (status) {
      const pill = document.createElement('span');
      pill.className = 'filter-badge';
      pill.textContent = `Status: ${status}`;
      activeFilterPills.appendChild(pill);
    }
  }


  async function fetchStudents() {
    tableLoading.classList.remove('hidden');
    emptyState.classList.add('hidden');
    updateFilterPills();

    try {
      const params = new URLSearchParams({
        search: searchInput.value.trim(),
        course: courseFilter.value,
        status: statusFilter.value,
        sortBy: sortBy.value,
        sortOrder: state.sortOrder
      });

      const res = await fetch(`/api/students?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        state.students = json.data || [];
        renderTable(state.students);
      } else {
        showToast(json.message || 'Error fetching records.', 'error');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Network error while connecting to server.', 'error');
    } finally {
      tableLoading.classList.add('hidden');
    }
  }

  function renderTable(students) {
    studentTableBody.innerHTML = '';
    const count = students.length;
    recordCountLabel.textContent = `Showing ${count} student${count === 1 ? '' : 's'}`;

    if (count === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    students.forEach(student => {
      const tr = document.createElement('tr');
      const initials = getInitials(student.first_name, student.last_name);
      const gpaClass = getGpaClass(student.gpa);
      const statusClass = getStatusClass(student.status);
      const formattedEnrollment = formatDate(student.enrollment_date);

      tr.innerHTML = `
        <td>
          <span class="id-badge" data-copy="${escapeHtml(student.student_id)}" title="Click to copy ID">
            ${escapeHtml(student.student_id)}
          </span>
        </td>
        <td>
          <div class="profile-cell">
            <div class="avatar-circle">${initials}</div>
            <div class="profile-details">
              <span class="profile-name">${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</span>
              <span class="profile-email">${escapeHtml(student.email)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="course-badge">${escapeHtml(student.course)}</span>
        </td>
        <td>
          <span class="date-text">${formattedEnrollment}</span>
        </td>
        <td>
          <span class="gpa-chip ${gpaClass}">
            ${parseFloat(student.gpa || 0).toFixed(2)}
          </span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">
            <span class="status-dot-inner"></span>
            <span>${escapeHtml(student.status)}</span>
          </span>
        </td>
        <td class="text-right">
          <div class="row-actions">
            <button class="action-btn btn-view" title="View Profile" data-id="${student.id}" type="button">View</button>
            <button class="action-btn btn-edit" title="Edit Record" data-id="${student.id}" type="button">Edit</button>
            <button class="action-btn btn-delete" title="Delete Record" data-id="${student.id}" type="button">Delete</button>
          </div>
        </td>
      `;

      studentTableBody.appendChild(tr);
    });
  }


  function openAddModal() {
    state.currentEditingId = null;
    modalTitle.textContent = 'Register New Student';
    modalSubtitle.textContent = 'Fill in student academic and personal details';
    btnSubmitText.textContent = 'Save Student';
    studentForm.reset();
    studentPkId.value = '';

    const today = new Date().toISOString().split('T')[0];
    inputEnrollmentDate.value = today;
    selectStudentStatus.value = 'Active';
    selectGender.value = 'Male';
    inputGpa.value = '3.50';

    studentModal.classList.remove('hidden');
    setTimeout(() => inputFirstName.focus(), 60);
  }

  function openEditModal(student) {
    state.currentEditingId = student.id;
    modalTitle.textContent = 'Edit Student Profile';
    modalSubtitle.textContent = `Updating records for ${student.first_name} ${student.last_name}`;
    btnSubmitText.textContent = 'Update Student';

    studentPkId.value = student.id;
    inputStudentId.value = student.student_id || '';
    inputFirstName.value = student.first_name || '';
    inputLastName.value = student.last_name || '';
    inputEmail.value = student.email || '';
    inputPhone.value = student.phone || '';
    inputDob.value = student.dob ? String(student.dob).split('T')[0] : '';
    selectGender.value = student.gender || 'Male';
    inputCourse.value = student.course || '';
    inputEnrollmentDate.value = student.enrollment_date ? String(student.enrollment_date).split('T')[0] : '';
    selectStudentStatus.value = student.status || 'Active';
    inputGpa.value = student.gpa !== undefined && student.gpa !== null ? parseFloat(student.gpa).toFixed(2) : '';
    inputAddress.value = student.address || '';

    studentModal.classList.remove('hidden');
    setTimeout(() => inputFirstName.focus(), 60);
  }

  function closeStudentModal() {
    studentModal.classList.add('hidden');
    studentForm.reset();
    state.currentEditingId = null;
  }


  function openViewModal(student) {
    state.currentViewingStudent = student;
    const initials = getInitials(student.first_name, student.last_name);
    const gpaClass = getGpaClass(student.gpa);
    const statusClass = getStatusClass(student.status);

    viewModalBody.innerHTML = `
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

      <div class="details-grid">
        <div class="detail-tile">
          <span class="tile-label">Email Address</span>
          <span class="tile-value">${escapeHtml(student.email)}</span>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Phone Number</span>
          <span class="tile-value">${escapeHtml(student.phone) || 'Not provided'}</span>
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
          <span class="tile-label">Academic Status</span>
          <div>
            <span class="status-pill ${statusClass}">
              <span class="status-dot-inner"></span>
              <span>${escapeHtml(student.status)}</span>
            </span>
          </div>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Cumulative GPA</span>
          <div>
            <span class="gpa-chip ${gpaClass}">${parseFloat(student.gpa || 0).toFixed(2)} / 4.00</span>
          </div>
        </div>
        <div class="detail-tile">
          <span class="tile-label">Registration Record</span>
          <span class="tile-value">${student.created_at ? formatDate(student.created_at) : 'N/A'}</span>
        </div>
        <div class="detail-tile span-all">
          <span class="tile-label">Residential Address</span>
          <span class="tile-value">${escapeHtml(student.address) || 'No residential address recorded.'}</span>
        </div>
      </div>
    `;

    viewModal.classList.remove('hidden');
  }

  function closeViewModal() {
    viewModal.classList.add('hidden');
    state.currentViewingStudent = null;
  }


  function openDeleteModal(student) {
    state.studentToDelete = student;
    deleteStudentName.textContent = `${student.first_name} ${student.last_name}`;
    deleteStudentCode.textContent = student.student_id;
    deleteStudentCourse.textContent = student.course || 'Student Record';
    deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    state.studentToDelete = null;
  }

  async function handleConfirmDelete() {
    if (!state.studentToDelete) return;
    const { id, first_name, last_name, student_id } = state.studentToDelete;

    try {
      btnConfirmDelete.disabled = true;
      btnConfirmDelete.textContent = 'Deleting...';

      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const json = await res.json();

      if (json.success) {
        showToast(`Student ${first_name} ${last_name} (${student_id}) deleted!`, 'success');
        closeDeleteModal();
        await fetchStudents();
        await fetchStats();
      } else {
        showToast(json.message || 'Failed to delete student.', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Network error while deleting record.', 'error');
    } finally {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = 'Delete Student';
    }
  }


  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isEdit = Boolean(state.currentEditingId);
    const url = isEdit ? `/api/students/${state.currentEditingId}` : '/api/students';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      student_id: inputStudentId.value.trim(),
      first_name: inputFirstName.value.trim(),
      last_name: inputLastName.value.trim(),
      email: inputEmail.value.trim(),
      phone: inputPhone.value.trim(),
      dob: inputDob.value || null,
      gender: selectGender.value,
      course: inputCourse.value.trim(),
      enrollment_date: inputEnrollmentDate.value,
      status: selectStudentStatus.value,
      gpa: inputGpa.value !== '' ? parseFloat(inputGpa.value) : 0.00,
      address: inputAddress.value.trim()
    };

    try {
      btnSubmitStudent.disabled = true;
      btnSubmitText.textContent = isEdit ? 'Updating...' : 'Saving...';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (json.success) {
        showToast(json.message || (isEdit ? 'Student updated!' : 'Student registered!'), 'success');
        closeStudentModal();
        await fetchStudents();
        await fetchStats();
      } else {
        showToast(json.message || 'Submission failed.', 'error');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Failed to communicate with server.', 'error');
    } finally {
      btnSubmitStudent.disabled = false;
      btnSubmitText.textContent = isEdit ? 'Update Student' : 'Save Student';
    }
  });


  studentTableBody.addEventListener('click', (e) => {
    const copyTarget = e.target.closest('[data-copy]');
    if (copyTarget) {
      copyToClipboard(copyTarget.dataset.copy);
      return;
    }

    const actionBtn = e.target.closest('.action-btn');
    if (!actionBtn) return;

    const studentId = parseInt(actionBtn.dataset.id, 10);
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;

    if (actionBtn.classList.contains('btn-view')) {
      openViewModal(student);
    } else if (actionBtn.classList.contains('btn-edit')) {
      openEditModal(student);
    } else if (actionBtn.classList.contains('btn-delete')) {
      openDeleteModal(student);
    }
  });

  viewModalBody.addEventListener('click', (e) => {
    const copyTarget = e.target.closest('[data-copy]');
    if (copyTarget) {
      copyToClipboard(copyTarget.dataset.copy);
    }
  });


  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() !== '') {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
    }

    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(() => {
      fetchStudents();
    }, 280);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    searchInput.focus();
    fetchStudents();
  });

  courseFilter.addEventListener('change', fetchStudents);
  statusFilter.addEventListener('change', fetchStudents);
  sortBy.addEventListener('change', fetchStudents);

  btnToggleSortOrder.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    sortOrderText.textContent = state.sortOrder;
    fetchStudents();
  });

  btnRefresh.addEventListener('click', async () => {
    btnRefresh.disabled = true;
    btnRefresh.textContent = 'Refreshing...';
    await Promise.all([fetchStudents(), fetchStats(), checkSystemHealth()]);
    btnRefresh.disabled = false;
    btnRefresh.textContent = 'Refresh';
    showToast('Records refreshed', 'info');
  });

  btnResetFilters.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    courseFilter.value = '';
    statusFilter.value = '';
    sortBy.value = 'id';
    state.sortOrder = 'DESC';
    sortOrderText.textContent = 'DESC';
    fetchStudents();
  });


  btnOpenAddModal.addEventListener('click', openAddModal);
  btnCloseModal.addEventListener('click', closeStudentModal);
  btnCancelModal.addEventListener('click', closeStudentModal);

  btnCloseViewModal.addEventListener('click', closeViewModal);
  btnCloseViewBtn.addEventListener('click', closeViewModal);
  btnEditFromView.addEventListener('click', () => {
    const student = state.currentViewingStudent;
    closeViewModal();
    if (student) openEditModal(student);
  });

  btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
  btnCancelDelete.addEventListener('click', closeDeleteModal);
  btnConfirmDelete.addEventListener('click', handleConfirmDelete);

  [studentModal, viewModal, deleteModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      studentModal.classList.add('hidden');
      viewModal.classList.add('hidden');
      deleteModal.classList.add('hidden');
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === '/' && document.activeElement !== searchInput && !['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) {
      e.preventDefault();
      searchInput.focus();
    }
  });


  checkSystemHealth();
  fetchStats();
  fetchStudents();
});

