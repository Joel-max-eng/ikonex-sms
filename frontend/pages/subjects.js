const subjects = {
  data: [], classes: [],

  async render() {
    document.getElementById('page-container').innerHTML = `<div class="page"><div class="loading">Loading...</div></div>`;
    [this.data, this.classes] = await Promise.all([http.get('/subjects'), http.get('/classes')]);
    this.show();
  },

  show() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <h1 class="page-title">Subjects</h1>
            <p class="page-subtitle">${this.data.length} subjects available</p>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-outline" onclick="subjects.openAssign()">
              <i class="ti ti-link"></i> Assign to Class
            </button>
            <button class="btn btn-primary" onclick="subjects.openForm()">
              <i class="ti ti-plus"></i> Add Subject
            </button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Subject Name</th><th>Code</th><th>Max Score</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${this.data.length ? this.data.map((sub, i) => `
                <tr>
                  <td class="text-muted">${i + 1}</td>
                  <td class="fw-500">${sub.name}</td>
                  <td><span class="badge badge-blue">${sub.code}</span></td>
                  <td>${sub.max_score}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm btn-icon"
                      onclick='subjects.openForm(${JSON.stringify(sub)})'>
                      <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--danger)"
                      onclick="confirmDelete('Delete subject <b>${sub.name}</b>?',
                        async () => { await http.delete('/subjects/${sub.id}'); showToast('Subject deleted'); subjects.render(); })">
                      <i class="ti ti-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-book"></i><p>No subjects yet</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openForm(sub = null) {
    const editing = !!sub;
    openModal(
      editing ? 'Edit Subject' : 'Add Subject',
      `<div class="form-group"><label>Subject Name</label>
        <input id="f-name" value="${sub?.name||''}" placeholder="e.g. Mathematics"/></div>
       <div class="form-row">
        <div class="form-group"><label>Code</label>
          <input id="f-code" value="${sub?.code||''}" placeholder="e.g. MAT"/></div>
        <div class="form-group"><label>Max Score</label>
          <input id="f-max" type="number" value="${sub?.max_score||100}"/></div>
       </div>`,
      `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="subjects.save(${editing?sub.id:'null'})">
         ${editing?'Save Changes':'Add Subject'}
       </button>`
    );
  },

  openAssign() {
    openModal(
      'Assign Subject to Class',
      `<div class="form-group"><label>Class Stream</label>
        <select id="f-class">
          ${this.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select></div>
       <div class="form-group"><label>Subject</label>
        <select id="f-subject">
          ${this.data.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
        </select></div>`,
      `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="subjects.assign()">Assign</button>`
    );
  },

  async assign() {
    const res = await http.post('/subjects/assign', {
      class_id: document.getElementById('f-class').value,
      subject_id: document.getElementById('f-subject').value,
    });
    if (res.error) return showToast(res.error, 'error');
    showToast('Subject assigned to class!');
    closeModal();
  },

  async save(id) {
    const body = {
      name: document.getElementById('f-name').value.trim(),
      code: document.getElementById('f-code').value.trim().toUpperCase(),
      max_score: parseInt(document.getElementById('f-max').value) || 100,
    };
    if (!body.name || !body.code) return showToast('Fill all required fields', 'error');
    const res = id ? await http.put(`/subjects/${id}`, body) : await http.post('/subjects', body);
    if (res.error) return showToast(res.error, 'error');
    showToast(id ? 'Subject updated!' : 'Subject added!');
    closeModal();
    this.render();
  }
};