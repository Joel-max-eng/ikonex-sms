const students = {
  data: [], classes: [], filtered: [],

  async render() {
    document.getElementById('page-container').innerHTML = `<div class="page"><div class="loading">Loading...</div></div>`;
    [this.data, this.classes] = await Promise.all([http.get('/students'), http.get('/classes')]);
    this.filtered = [...this.data];
    this.show();
  },

  show() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <h1 class="page-title">Students</h1>
            <p class="page-subtitle">${this.data.length} students registered</p>
          </div>
          <button class="btn btn-primary" onclick="students.openForm()">
            <i class="ti ti-user-plus"></i> Register Student
          </button>
        </div>

        <div class="toolbar">
          <div class="search-input">
            <i class="ti ti-search"></i>
            <input placeholder="Search by name or Adm No..." oninput="students.search(this.value)" id="search-box"/>
          </div>
          <select class="filter-select" onchange="students.filterByClass(this.value)">
            <option value="">All Classes</option>
            ${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
          <span class="text-muted text-sm" id="count-label">${this.filtered.length} students</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Adm No</th><th>Class</th><th>Gender</th><th>Guardian</th><th>Actions</th></tr>
            </thead>
            <tbody id="students-tbody">
              ${this.renderRows(this.filtered)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(list) {
    if (!list.length) return `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-users"></i><p>No students found</p></div></td></tr>`;
    return list.map((s, i) => `
      <tr>
        <td class="text-muted">${i + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar">${avatarInitials(s.first_name, s.last_name)}</div>
            <div>
              <div class="fw-500">${s.first_name} ${s.last_name}</div>
              <div class="text-sm text-muted">${formatDate(s.dob)}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-gray">${s.adm_no}</span></td>
        <td>${s.class_name}</td>
        <td><span class="badge ${s.gender==='Female'?'badge-orange':'badge-blue'}">${s.gender}</span></td>
        <td><div class="fw-500">${s.guardian_name||'-'}</div><div class="text-sm text-muted">${s.guardian_phone||''}</div></td>
        <td>
          <button class="btn btn-ghost btn-sm btn-icon" title="Edit"
            onclick='students.openForm(${JSON.stringify(s)})'>
            <i class="ti ti-edit"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--danger)" title="Delete"
            onclick="confirmDelete('Delete student <b>${s.first_name} ${s.last_name}</b>?',
              async () => { await http.delete('/students/${s.id}'); showToast('Student deleted'); students.render(); })">
            <i class="ti ti-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  search(val) {
    const q = val.toLowerCase();
    this.filtered = this.data.filter(s =>
      `${s.first_name} ${s.last_name} ${s.adm_no}`.toLowerCase().includes(q)
    );
    document.getElementById('students-tbody').innerHTML = this.renderRows(this.filtered);
    document.getElementById('count-label').textContent = `${this.filtered.length} students`;
  },

  filterByClass(classId) {
    this.filtered = classId ? this.data.filter(s => s.class_id == classId) : [...this.data];
    document.getElementById('students-tbody').innerHTML = this.renderRows(this.filtered);
    document.getElementById('count-label').textContent = `${this.filtered.length} students`;
  },

  openForm(s = null) {
    const editing = !!s;
    openModal(
      editing ? 'Edit Student' : 'Register Student',
      `<div class="form-row">
        <div class="form-group"><label>First Name</label>
          <input id="f-fname" value="${s?.first_name||''}" placeholder="First name"/></div>
        <div class="form-group"><label>Last Name</label>
          <input id="f-lname" value="${s?.last_name||''}" placeholder="Last name"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Admission No</label>
          <input id="f-adm" value="${s?.adm_no||''}" placeholder="e.g. IK-001"/></div>
        <div class="form-group"><label>Gender</label>
          <select id="f-gender">
            <option ${s?.gender==='Male'?'selected':''}>Male</option>
            <option ${s?.gender==='Female'?'selected':''}>Female</option>
          </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Date of Birth</label>
          <input id="f-dob" type="date" value="${s?.dob||''}"/></div>
        <div class="form-group"><label>Class Stream</label>
          <select id="f-class">
            ${this.classes.map(c=>`<option value="${c.id}" ${s?.class_id==c.id?'selected':''}>${c.name}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Guardian Name</label>
          <input id="f-gname" value="${s?.guardian_name||''}" placeholder="Guardian full name"/></div>
        <div class="form-group"><label>Guardian Phone</label>
          <input id="f-gphone" value="${s?.guardian_phone||''}" placeholder="e.g. 0712345678"/></div>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="students.save(${editing?s.id:'null'})">
         ${editing?'Save Changes':'Register Student'}
       </button>`
    );
  },

  async save(id) {
    const body = {
      adm_no: document.getElementById('f-adm').value.trim(),
      first_name: document.getElementById('f-fname').value.trim(),
      last_name: document.getElementById('f-lname').value.trim(),
      gender: document.getElementById('f-gender').value,
      dob: document.getElementById('f-dob').value,
      class_id: document.getElementById('f-class').value,
      guardian_name: document.getElementById('f-gname').value.trim(),
      guardian_phone: document.getElementById('f-gphone').value.trim(),
    };
    if (!body.first_name || !body.last_name || !body.adm_no) return showToast('Fill all required fields', 'error');
    const res = id ? await http.put(`/students/${id}`, body) : await http.post('/students', body);
    if (res.error) return showToast(res.error, 'error');
    showToast(id ? 'Student updated!' : 'Student registered!');
    closeModal();
    this.render();
  }
};