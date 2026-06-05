const classes = {
  data: [],

  async render() {
    document.getElementById('page-container').innerHTML = `<div class="page"><div class="loading">Loading...</div></div>`;
    this.data = await http.get('/classes');
    this.show();
  },

  show() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <h1 class="page-title">Class Streams</h1>
            <p class="page-subtitle">${this.data.length} streams registered</p>
          </div>
          <button class="btn btn-primary" onclick="classes.openForm()">
            <i class="ti ti-plus"></i> Add Stream
          </button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Stream Name</th><th>Year Group</th>
                <th>Section</th><th>Capacity</th><th>Students</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.data.length ? this.data.map((c, i) => `
                <tr>
                  <td class="text-muted">${i + 1}</td>
                  <td><span class="fw-500">${c.name}</span></td>
                  <td>${c.year_group}</td>
                  <td><span class="badge badge-blue">${c.section}</span></td>
                  <td>${c.capacity}</td>
                  <td><span class="badge badge-green">${c.student_count}</span></td>
                  <td style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm btn-icon" title="View Details"
                      onclick="classes.viewDetail(${c.id})">
                      <i class="ti ti-eye"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon" title="Edit"
                      onclick="classes.openForm(${JSON.stringify(c).split('"').join("'")})">
                      <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon" title="Delete"
                      style="color:var(--danger)"
                      onclick="confirmDelete('Delete stream <b>${c.name}</b>? This cannot be undone.',
                        async () => { await http.delete('/classes/${c.id}'); showToast('Stream deleted'); classes.render(); })">
                      <i class="ti ti-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7">
                    <div class="empty-state">
                      <i class="ti ti-school"></i>
                      <p>No class streams yet. Click "Add Stream" to create one.</p>
                    </div>
                  </td>
                </tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async viewDetail(classId) {
    const [cls, students] = await Promise.all([
      http.get(`/classes/${classId}`),
      http.get(`/students/class/${classId}`)
    ]);

    openModal(
      `${cls.name} — Class Details`,
      `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="background:var(--surface);padding:14px;border-radius:10px;border:1px solid var(--border)">
          <div class="text-sm text-muted" style="margin-bottom:4px">Year Group</div>
          <div class="fw-500" style="font-size:15px">${cls.year_group}</div>
        </div>
        <div style="background:var(--surface);padding:14px;border-radius:10px;border:1px solid var(--border)">
          <div class="text-sm text-muted" style="margin-bottom:4px">Section</div>
          <div class="fw-500" style="font-size:15px">${cls.section}</div>
        </div>
        <div style="background:var(--surface);padding:14px;border-radius:10px;border:1px solid var(--border)">
          <div class="text-sm text-muted" style="margin-bottom:4px">Capacity</div>
          <div class="fw-500" style="font-size:15px">${cls.capacity} students</div>
        </div>
        <div style="background:var(--surface);padding:14px;border-radius:10px;border:1px solid var(--border)">
          <div class="text-sm text-muted" style="margin-bottom:4px">Currently Enrolled</div>
          <div class="fw-500" style="font-size:15px;color:var(--success)">${students.length} students</div>
        </div>
      </div>

      <div style="margin-bottom:10px;font-weight:600;font-size:13px;color:var(--text-2);
                  text-transform:uppercase;letter-spacing:0.4px">
        Students in ${cls.name}
      </div>

      <div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">
        ${students.length ? students.map((s, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;
                      border-bottom:1px solid var(--border);background:${i%2===0?'#fff':'var(--surface)'}">
            <div class="avatar">${avatarInitials(s.first_name, s.last_name)}</div>
            <div style="flex:1">
              <div class="fw-500">${s.first_name} ${s.last_name}</div>
              <div class="text-sm text-muted">${s.adm_no}</div>
            </div>
            <span class="badge ${s.gender==='Female'?'badge-orange':'badge-blue'}">${s.gender}</span>
            <span class="text-sm text-muted">${formatDate(s.dob)}</span>
          </div>
        `).join('') : `
          <div class="empty-state" style="padding:30px">
            <i class="ti ti-users"></i>
            <p>No students enrolled in this class yet</p>
          </div>
        `}
      </div>
      `,
      `<button class="btn btn-outline" onclick="closeModal()">Close</button>
       <button class="btn btn-primary" onclick="closeModal(); navigateTo('students')">
         <i class="ti ti-user-plus"></i> Add Student
       </button>`,
      true // large modal
    );
  },

  openForm(c = null) {
    const editing = !!c;
    openModal(
      editing ? 'Edit Class Stream' : 'Add Class Stream',
      `<div class="form-group">
        <label>Stream Name</label>
        <input id="f-name" value="${c?.name || ''}" placeholder="e.g. Form 1A"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Year Group</label>
          <select id="f-year">
            ${['Form 1','Form 2','Form 3','Form 4'].map(y =>
              `<option ${c?.year_group === y ? 'selected' : ''}>${y}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Section</label>
          <input id="f-section" value="${c?.section || ''}" placeholder="e.g. A"/>
        </div>
      </div>
      <div class="form-group">
        <label>Capacity</label>
        <input id="f-capacity" type="number" value="${c?.capacity || 40}"/>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="classes.save(${editing ? c.id : 'null'})">
         ${editing ? 'Save Changes' : 'Create Stream'}
       </button>`
    );
  },

  async save(id) {
    const body = {
      name:       document.getElementById('f-name').value.trim(),
      year_group: document.getElementById('f-year').value,
      section:    document.getElementById('f-section').value.trim(),
      capacity:   parseInt(document.getElementById('f-capacity').value),
    };
    if (!body.name || !body.section) return showToast('Fill all required fields', 'error');
    const res = id
      ? await http.put(`/classes/${id}`, body)
      : await http.post('/classes', body);
    if (res.error) return showToast(res.error, 'error');
    showToast(id ? 'Stream updated!' : 'Stream created!');
    closeModal();
    this.render();
  }
};