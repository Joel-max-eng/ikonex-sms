const results = {
  classes: [], subjects: [],

  async render() {
    document.getElementById('page-container').innerHTML = `<div class="page"><div class="loading">Loading...</div></div>`;
    [this.classes, this.subjects] = await Promise.all([http.get('/classes'), http.get('/subjects')]);
    this.show();
  },

  show() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1 class="page-title">Results & Rankings</h1>
          <p class="page-subtitle">View performance, rankings and generate reports</p>
        </div>

        <div class="tabs">
          <button class="tab active" onclick="results.switchTab('class', this)">Class Rankings</button>
          <button class="tab" onclick="results.switchTab('subject', this)">Subject Performance</button>
          <button class="tab" onclick="results.switchTab('student', this)">Student Profile</button>
        </div>

        <div id="tab-class">
          <div class="card mb-4">
            <div class="card-header"><span class="card-title">Select Class & Term</span></div>
            <div class="card-body">
              <div class="form-row-3">
                <div class="form-group"><label>Class Stream</label>
                  <select id="res-class">
                    <option value="">-- Select Class --</option>
                    ${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group"><label>Term</label>
                  <select id="res-term">
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
                <div class="form-group"><label>Year</label>
                  <input id="res-year" type="number" value="${new Date().getFullYear()}"/>
                </div>
              </div>
              <div style="display:flex;gap:10px">
                <button class="btn btn-primary" onclick="results.loadClass()">
                  <i class="ti ti-chart-bar"></i> Load Results
                </button>
                <button class="btn btn-outline" onclick="results.downloadClassPDF()">
                  <i class="ti ti-file-text"></i> Download Class PDF
                </button>
              </div>
            </div>
          </div>
          <div id="class-results"></div>
        </div>

        <div id="tab-subject" class="hidden">
          <div class="card mb-4">
            <div class="card-header"><span class="card-title">Subject Performance</span></div>
            <div class="card-body">
              <div class="form-row-3">
                <div class="form-group"><label>Class Stream</label>
                  <select id="sub-class">
                    <option value="">-- Select Class --</option>
                    ${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group"><label>Subject</label>
                  <select id="sub-subject">
                    <option value="">-- Select Subject --</option>
                    ${this.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group"><label>Term</label>
                  <select id="sub-term">
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Year</label>
                <input id="sub-year" type="number" value="${new Date().getFullYear()}" style="max-width:150px"/>
              </div>
              <button class="btn btn-primary" onclick="results.loadSubject()">
                <i class="ti ti-list"></i> Load Subject Performance
              </button>
            </div>
          </div>
          <div id="subject-results"></div>
        </div>

        <div id="tab-student" class="hidden">
          <div class="card mb-4">
            <div class="card-header"><span class="card-title">Individual Student Profile</span></div>
            <div class="card-body">
              <div class="form-row-3">
                <div class="form-group"><label>Class Stream</label>
                  <select id="stu-class" onchange="results.loadStudentList(this.value)">
                    <option value="">-- Select Class --</option>
                    ${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group"><label>Student</label>
                  <select id="stu-student">
                    <option value="">-- Select Student --</option>
                  </select>
                </div>
                <div class="form-group"><label>Term</label>
                  <select id="stu-term">
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Year</label>
                <input id="stu-year" type="number" value="${new Date().getFullYear()}" style="max-width:150px"/>
              </div>
              <button class="btn btn-primary" onclick="results.loadStudent()">
                <i class="ti ti-user"></i> View Student Profile
              </button>
            </div>
          </div>
          <div id="student-results"></div>
        </div>
      </div>
    `;
  },

  switchTab(tab, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    ['class','subject','student'].forEach(t => {
      document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab);
    });
  },

  async loadStudentList(classId) {
    if (!classId) return;
    const studs = await http.get(`/students/class/${classId}`);
    const sel = document.getElementById('stu-student');
    sel.innerHTML = studs.map(s =>
      `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.adm_no})</option>`
    ).join('');
  },

  async loadClass() {
    const classId = document.getElementById('res-class').value;
    const term    = document.getElementById('res-term').value;
    const year    = document.getElementById('res-year').value;
    if (!classId) return showToast('Please select a class', 'error');

    document.getElementById('class-results').innerHTML = `<div class="loading">Calculating rankings...</div>`;
    const data = await http.get(`/results/class/${classId}?term=${term}&year=${year}`);

    if (!data.length || data.error) {
      document.getElementById('class-results').innerHTML =
        `<div class="empty-state"><i class="ti ti-trophy"></i><p>No results found for this selection</p></div>`;
      return;
    }

    const className = this.classes.find(c => c.id == classId)?.name || '';

    document.getElementById('class-results').innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${className} · Term ${term} ${year} Rankings</span>
          <span class="badge badge-blue">${data.length} students</span>
        </div>
        <div class="table-wrap" style="border:none;box-shadow:none;border-radius:0">
          <table>
            <thead>
              <tr>
                <th>Pos</th><th>Student</th><th>Adm No</th>
                <th>Subjects</th><th>Total</th><th>Average</th>
                <th>Grade</th><th>Remarks</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(r => {
                const g = getGrade(r.average);
                const medal = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : r.position;
                return `
                  <tr>
                    <td><strong style="color:var(--primary)">${medal}</strong></td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div class="avatar">${avatarInitials(r.student.first_name, r.student.last_name)}</div>
                        <div class="fw-500">${r.student.first_name} ${r.student.last_name}</div>
                      </div>
                    </td>
                    <td><span class="badge badge-gray">${r.student.adm_no}</span></td>
                    <td class="text-muted">${r.subjectCount}</td>
                    <td class="fw-500">${r.totalMarks}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:50px">
                          <div class="progress-bar">
                            <div class="progress-fill ${r.average>=60?'good':r.average>=40?'warn':'poor'}"
                                 style="width:${r.average}%"></div>
                          </div>
                        </div>
                        <span>${r.average}%</span>
                      </div>
                    </td>
                    <td><span class="badge badge-${g.color}">${r.grade}</span></td>
                    <td class="text-muted text-sm">${r.remark}</td>
                    <td style="display:flex;gap:6px">
                      <a href="http://localhost:3000/api/reports/student/${r.student.id}?term=${term}&year=${year}"
                         target="_blank" class="btn btn-outline btn-sm">
                        <i class="ti ti-file-text"></i> PDF
                      </a>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  downloadClassPDF() {
    const classId = document.getElementById('res-class').value;
    const term    = document.getElementById('res-term').value;
    const year    = document.getElementById('res-year').value;
    if (!classId) return showToast('Select a class first', 'error');
    window.open(`http://localhost:3000/api/reports/class/${classId}?term=${term}&year=${year}`, '_blank');
  },

  async loadSubject() {
    const classId   = document.getElementById('sub-class').value;
    const subjectId = document.getElementById('sub-subject').value;
    const term      = document.getElementById('sub-term').value;
    const year      = document.getElementById('sub-year').value;
    if (!classId || !subjectId) return showToast('Select class and subject', 'error');

    document.getElementById('subject-results').innerHTML = `<div class="loading">Loading...</div>`;
    const data = await http.get(`/results/class/${classId}/subject/${subjectId}?term=${term}&year=${year}`);

    if (data.error) {
      document.getElementById('subject-results').innerHTML =
        `<div class="empty-state"><i class="ti ti-book"></i><p>${data.error}</p></div>`;
      return;
    }

    document.getElementById('subject-results').innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${data.subject?.name} · Class Performance</span>
          <div style="display:flex;gap:10px;align-items:center">
            <span class="badge badge-blue">Class Avg: ${data.classAverage}%</span>
            <span class="badge badge-green">${data.assessed}/${data.totalStudents} assessed</span>
          </div>
        </div>
        <div class="table-wrap" style="border:none;box-shadow:none;border-radius:0">
          <table>
            <thead>
              <tr>
                <th>Pos</th><th>Student</th><th>Adm No</th>
                <th>CAT (30)</th><th>Exam (70)</th><th>Total</th>
                <th>Grade</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${data.rows.map(r => {
                const g = getGrade(Number(r.total_score) || 0);
                return `
                  <tr>
                    <td><strong style="color:var(--primary)">${r.position}</strong></td>
                    <td class="fw-500">${r.first_name} ${r.last_name}</td>
                    <td><span class="badge badge-gray">${r.adm_no}</span></td>
                    <td>${r.cat_score ?? '-'}</td>
                    <td>${r.exam_score ?? '-'}</td>
                    <td class="fw-500">${r.total_score ?? '-'}</td>
                    <td><span class="badge badge-${r.total_score ? g.color : 'gray'}">${r.grade}</span></td>
                    <td class="text-muted text-sm">${r.remark}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async loadStudent() {
    const studentId = document.getElementById('stu-student').value;
    const term      = document.getElementById('stu-term').value;
    const year      = document.getElementById('stu-year').value;
    if (!studentId) return showToast('Select a student', 'error');

    document.getElementById('student-results').innerHTML = `<div class="loading">Loading student profile...</div>`;
    const data = await http.get(`/results/student/${studentId}?term=${term}&year=${year}`);

    if (data.error) {
      document.getElementById('student-results').innerHTML =
        `<div class="empty-state"><i class="ti ti-user"></i><p>${data.error}</p></div>`;
      return;
    }

    const g = getGrade(data.average);

    document.getElementById('student-results').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px">

        <!-- Student info card -->
        <div class="card">
          <div class="card-body" style="text-align:center;padding:30px 20px">
            <div class="avatar" style="width:64px;height:64px;font-size:22px;margin:0 auto 12px">
              ${avatarInitials(data.student.first_name, data.student.last_name)}
            </div>
            <h3 style="font-size:16px;margin-bottom:4px">${data.student.first_name} ${data.student.last_name}</h3>
            <p class="text-muted text-sm">${data.student.adm_no}</p>
            <p class="text-muted text-sm">${data.student.class_name}</p>
            <div style="margin:16px 0;padding:16px;background:var(--surface);border-radius:10px">
              <div style="font-size:32px;font-weight:300;color:var(--primary)">${data.average}%</div>
              <div class="text-muted text-sm">Average Score</div>
            </div>
            <div style="display:flex;justify-content:space-around;margin-bottom:16px">
              <div>
                <div class="fw-500" style="font-size:18px">${data.totalMarks}</div>
                <div class="text-sm text-muted">Total Marks</div>
              </div>
              <div>
                <div class="fw-500" style="font-size:18px">${data.overallPosition}/${data.totalStudents}</div>
                <div class="text-sm text-muted">Class Position</div>
              </div>
            </div>
            <span class="badge badge-${g.color}" style="font-size:14px;padding:6px 16px">${data.grade} — ${data.remark}</span>
            <div style="margin-top:16px">
              <a href="http://localhost:3000/api/reports/student/${studentId}?term=${term}&year=${year}"
                 target="_blank" class="btn btn-primary w-full">
                <i class="ti ti-file-text"></i> Download Report Card
              </a>
            </div>
          </div>
        </div>

        <!-- Scores breakdown -->
        <div class="card">
          <div class="card-header"><span class="card-title">Subject Performance · Term ${term} ${year}</span></div>
          <div class="table-wrap" style="border:none;box-shadow:none;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Subject</th><th>CAT</th><th>Exam</th>
                  <th>Total</th><th>Grade</th><th>Position</th>
                </tr>
              </thead>
              <tbody>
                ${data.scores.length ? data.scores.map(s => {
                  const sg = getGrade(Number(s.total_score));
                  return `
                    <tr>
                      <td class="fw-500">${s.subject_name}</td>
                      <td>${s.cat_score}</td>
                      <td>${s.exam_score}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px">
                          <div style="width:40px">
                            <div class="progress-bar">
                              <div class="progress-fill ${Number(s.total_score)>=60?'good':Number(s.total_score)>=40?'warn':'poor'}"
                                   style="width:${s.total_score}%"></div>
                            </div>
                          </div>
                          <span class="fw-500">${s.total_score}</span>
                        </div>
                      </td>
                      <td><span class="badge badge-${sg.color}">${s.grade}</span></td>
                      <td class="text-muted">${s.subject_position}/${s.total_in_class}</td>
                    </tr>
                  `;
                }).join('') : `
                  <tr><td colspan="6">
                    <div class="empty-state" style="padding:30px">
                      <i class="ti ti-clipboard-x"></i>
                      <p>No scores recorded for this term</p>
                    </div>
                  </td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
};