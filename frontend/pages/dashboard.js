const dashboard = {
  async render() {
    document.getElementById('page-container').innerHTML = `<div class="page"><div class="loading">Loading dashboard...</div></div>`;
    const [classes, students, subjects] = await Promise.all([
      http.get('/classes'),
      http.get('/students'),
      http.get('/subjects'),
    ]);

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Academic Overview · Ikonex Academy</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card" style="border-left:3px solid var(--primary)">
            <div class="stat-label">Total Students</div>
            <div class="stat-value">${students.length}</div>
            <div class="stat-sub">Across ${classes.length} streams</div>
          </div>
          <div class="stat-card" style="border-left:3px solid var(--accent)">
            <div class="stat-label">Class Streams</div>
            <div class="stat-value">${classes.length}</div>
            <div class="stat-sub">${[...new Set(classes.map(c => c.year_group))].length} year groups</div>
          </div>
          <div class="stat-card" style="border-left:3px solid #9B59B6">
            <div class="stat-label">Subjects</div>
            <div class="stat-value">${subjects.length}</div>
            <div class="stat-sub">Available this term</div>
          </div>
          <div class="stat-card" style="border-left:3px solid var(--success)">
            <div class="stat-label">Total Enrolled</div>
            <div class="stat-value">${students.length}</div>
            <div class="stat-sub">${students.filter(s=>s.gender==='Female').length} female · ${students.filter(s=>s.gender==='Male').length} male</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
          <div class="card">
            <div class="card-header"><span class="card-title">Students per Class</span></div>
            <div class="card-body" style="padding:0">
              ${classes.map(c => `
                <div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
                  <div style="flex:1">
                    <div class="fw-500">${c.name}</div>
                    <div class="text-sm text-muted">${c.year_group}</div>
                  </div>
                  <span class="badge badge-blue">${c.student_count} students</span>
                  <div style="width:80px">
                    <div class="progress-bar">
                      <div class="progress-fill ${c.student_count/c.capacity > 0.8 ? 'warn' : 'good'}"
                           style="width:${Math.min(100, Math.round(c.student_count/c.capacity*100))}%"></div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title">Quick Actions</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
              ${[
                { label:'Register New Student', icon:'ti-user-plus',  page:'students',    color:'var(--primary)' },
                { label:'Add Class Stream',     icon:'ti-school',      page:'classes',     color:'var(--accent)' },
                { label:'Manage Subjects',      icon:'ti-book',        page:'subjects',    color:'#9B59B6' },
                { label:'Enter Scores',         icon:'ti-pencil',      page:'assessments', color:'var(--success)' },
                { label:'View Results',         icon:'ti-trophy',      page:'results',     color:'var(--danger)' },
              ].map(a => `
                <button class="btn btn-outline w-full" onclick="navigateTo('${a.page}')"
                        style="justify-content:flex-start;gap:10px">
                  <i class="ti ${a.icon}" style="color:${a.color};font-size:17px"></i>
                  ${a.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};