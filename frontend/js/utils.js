// ── Navigation ──
function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  const pages = { dashboard, classes, students, subjects, assessments, results };
  if (pages[page]) pages[page].render();
  // Close mobile sidebar on navigation
  if (window.innerWidth <= 768) closeMobileSidebar();
}

// ── Sidebar toggle (desktop) ──
let sidebarOpen = true;
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    toggleMobileSidebar();
    return;
  }
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  document.getElementById('toggleIcon').className = sidebarOpen ? 'ti ti-chevron-left' : 'ti ti-chevron-right';
}

// ── Mobile sidebar ──
function toggleMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('mobile-overlay');
  const isOpen   = sidebar.classList.contains('mobile-open');
  isOpen ? closeMobileSidebar() : openMobileSidebar();
}
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('mobile-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobile-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Modal ──
function openModal(title, bodyHtml, footerHtml = '', large = false) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modal').className = 'modal' + (large ? ' modal-lg' : '');
  document.getElementById('modalBackdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
  document.body.style.overflow = '';
}
document.getElementById('modalBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modalBackdrop')) closeModal();
});

// ── Toast ──
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type}`;
  setTimeout(() => t.classList.add('hidden'), 3500);
}

// ── Helpers ──
function getGrade(score) {
  if (score >= 80) return { grade: 'A',  remark: 'Excellent',     color: 'green'  };
  if (score >= 70) return { grade: 'B+', remark: 'Very Good',     color: 'blue'   };
  if (score >= 60) return { grade: 'B',  remark: 'Good',          color: 'blue'   };
  if (score >= 50) return { grade: 'C+', remark: 'Average',       color: 'orange' };
  if (score >= 40) return { grade: 'C',  remark: 'Below Average', color: 'orange' };
  if (score >= 30) return { grade: 'D',  remark: 'Poor',          color: 'gray'   };
  return               { grade: 'E',  remark: 'Fail',          color: 'red'    };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function avatarInitials(first, last) {
  return (first?.[0] || '') + (last?.[0] || '');
}

function confirmDelete(message, onConfirm) {
  openModal(
    '⚠️ Confirm Delete',
    `<p style="color:var(--text-2)">${message}</p>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="closeModal(); (${onConfirm})()">Yes, Delete</button>`
  );
}