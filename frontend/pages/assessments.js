const assessments = {
  classes: [], subjects: [], currentClass: null, currentSubject: null,
  term: '1', year: new Date().getFullYear().toString(),

  async render() {
    document.getElementById('page-container').innerHTML = `<div class="page"><div class="loading">Loading...</div></div>`;
    [this.classes, this.subjects] = await Promise.all([http.get('/classes'), http.get('/subjects')]);
    this.show();
  },

  show() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1 class="page-title">Assessments & Scores</h1>
          <p class="page-subtitle">Enter and manage student scores</p>
        </div>

        <div class="card mb-4">
          <div class="card-header"><span class="card-title">Select Class & Subject</span></div>
          <div class="card-body">
            <div class="form-row-3">
              <div class="form-group">
                <label>Class Stream</label>
                <select id="sel-class" onchange="assessments.onClassChange(this.value)">
                  <option value="">-- Select Class --</option>
                  ${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Subject</label>
                <select id="sel-subject">
                  <option value="">-- Select Subject --</option>
                  ${this.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Term</label>
                <select id="sel-term">
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Year</label>
                <input id="sel-year" value="${new Date().getFullYear()}" type="number"/>
              </div>
              <div class="form-group" style="display:flex;align-items:flex-end">
                <button class="btn btn-primary w-full" onclick="assessments.loadScores()">
                  <i class="ti ti-table"></i> Load Score Sheet
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="score-sheet"></div>
      </div>
    `;
  },

  async onClassChange(classId) {
    const subs = await http.get(`/subjects/class/${classId}`);
    const sel = document.getElementById('sel-subject');
    sel.innerHTML = subs.length
      ? subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
      : '<option value="">No subjects assigned to this class</option>';
  },

  async loadScores() {
    const classId   = document.getElementById('sel-class').value;
    const subjectId = document.getElementById('sel-subject').value;
    const term      = document.getElementById('sel-term').value;
    const year      = document.getElementById('sel-year').value;

    if (!classId || !subjectId) return showToast('Select class and subject first', 'error');

    document.getElementById('score-sheet').innerHTML = `<div class="loading">Loading students...</div>`;

    const rows = await http.get(`/scores/class/${classId}/subject/${subjectId}?term=${term}&year=${year}`);

    this.currentClass   = classId;
    this.currentSubject = subjectId;
    this.term  = term;
    this.year  = year;

    document.getElementById('score-sheet').innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Score Entry Sheet · Term ${term} ${year}</span>
          <button class="btn btn-primary btn-sm" onclick="assessments.saveAll()">
            <i class="ti ti-device-floppy"></i> Save All Scores
          </button>
        </div>
        <div class="table-wrap" style="border:none;border-radius:0;box-shadow:none">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Adm No</th>
                <th>CAT Score <small class="text-muted">(max 30)</small></th>
                <th>Exam Score <small class="text-muted">(max 70)</small></th>
                <th>Total</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => {
                const cat   = Number(r.cat_score)  || 0;
                const exam  = Number(r.exam_score) || 0;
                const total = cat + exam;
                const g     = getGrade(total);
                const sid   = r.student_id;
                return `
                  <tr>
                    <td class="text-muted">${i + 1}</td>
                    <td class="fw-500">${r.first_name} ${r.last_name}</td>
                    <td><span class="badge badge-gray">${r.adm_no}</span></td>
                    <td class="score-cell">
                      <input
                        type="number" min="0" max="30"
                        value="${cat || ''}"
                        id="cat-${sid}"
                        placeholder="0"
                        oninput="assessments.updateTotal('${sid}')"
                      />
                    </td>
                    <td class="score-cell">
                      <input
                        type="number" min="0" max="70"
                        value="${exam || ''}"
                        id="exam-${sid}"
                        placeholder="0"
                        oninput="assessments.updateTotal('${sid}')"
                      />
                    </td>
                    <td class="score-total" id="total-${sid}">${total || '-'}</td>
                    <td id="grade-${sid}">
                      <span class="badge badge-${total ? g.color : 'gray'}">${total ? g.grade : '-'}</span>
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

  updateTotal(studentId) {
    const cat  = parseFloat(document.getElementById(`cat-${studentId}`)?.value)  || 0;
    const exam = parseFloat(document.getElementById(`exam-${studentId}`)?.value) || 0;
    const total = cat + exam;
    const g = getGrade(total);
    document.getElementById(`total-${studentId}`).textContent = total || '-';
    document.getElementById(`grade-${studentId}`).innerHTML =
      `<span class="badge badge-${total ? g.color : 'gray'}">${total ? g.grade : '-'}</span>`;
  },

  async saveAll() {
    // Collect all unique student IDs from the score inputs
    const inputs = document.querySelectorAll('[id^="cat-"]');
    if (!inputs.length) return showToast('No students to save', 'error');

    let saved = 0, errors = 0;

    for (const catInput of inputs) {
      const studentId = catInput.id.replace('cat-', '');
      const examInput = document.getElementById(`exam-${studentId}`);
      if (!examInput) continue;

      const cat  = parseFloat(catInput.value)  || 0;
      const exam = parseFloat(examInput.value) || 0;

      if (cat > 30) {
        showToast(`CAT score cannot exceed 30`, 'error');
        errors++;
        continue;
      }
      if (exam > 70) {
        showToast(`Exam score cannot exceed 70`, 'error');
        errors++;
        continue;
      }

      const res = await http.post('/scores', {
        student_id: studentId,
        subject_id: this.currentSubject,
        term:       this.term,
        year:       this.year,
        exam_score: exam,
        cat_score:  cat,
      });

      if (res.error) {
        console.error('Score save error:', res.error);
        errors++;
      } else {
        saved++;
      }
    }

    if (errors > 0) {
      showToast(`${saved} saved · ${errors} failed`, 'error');
    } else {
      showToast(`✅ ${saved} scores saved successfully!`);
      // Reload to show updated values
      this.loadScores();
    }
  }
};