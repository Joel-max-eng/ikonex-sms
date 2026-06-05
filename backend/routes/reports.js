const router = require('express').Router();
const db = require('../db');
const PDFDocument = require('pdfkit');

function getGradeInfo(score, scale) {
  return scale.find(g => score >= g.min_score && score <= g.max_score) || scale[scale.length - 1];
}

// ── Individual student PDF report card ──
router.get('/student/:studentId', async (req, res) => {
  const { term, year } = req.query;
  try {
    const [[student]] = await db.query(`
      SELECT s.*, cs.name as class_name
      FROM students s LEFT JOIN class_streams cs ON cs.id = s.class_id
      WHERE s.id = ?
    `, [req.params.studentId]);

    const [scores] = await db.query(`
      SELECT sc.*, sub.name as subject_name
      FROM scores sc INNER JOIN subjects sub ON sub.id = sc.subject_id
      WHERE sc.student_id = ? AND sc.term = ? AND sc.year = ?
      ORDER BY sub.name
    `, [req.params.studentId, term, year]);

    const [scale] = await db.query('SELECT * FROM grading_scale ORDER BY min_score DESC');

    // Get class position
    const [classAvgs] = await db.query(`
      SELECT s.id, AVG(sc.total_score) as avg_score
      FROM students s
      LEFT JOIN scores sc ON sc.student_id = s.id AND sc.term = ? AND sc.year = ?
      WHERE s.class_id = ?
      GROUP BY s.id ORDER BY avg_score DESC
    `, [term, year, student.class_id]);

    const position = classAvgs.findIndex(r => r.id === student.id) + 1;
    const totalStudents = classAvgs.length;
    const totalMarks = scores.reduce((a, s) => a + Number(s.total_score), 0);
    const avg = scores.length ? parseFloat((totalMarks / scores.length).toFixed(1)) : 0;
    const gradeInfo = getGradeInfo(avg, scale);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ReportCard_${student.adm_no}_T${term}_${year}.pdf`);
    doc.pipe(res);

    // ── Header ──
    doc.rect(0, 0, 595, 90).fill('#1B4F72');
    doc.fontSize(22).fillColor('#fff').font('Helvetica-Bold')
       .text('IKONEX ACADEMY', 50, 20, { align: 'center' });
    doc.fontSize(11).fillColor('#E67E22').font('Helvetica')
       .text('Student Academic Report Card', 50, 48, { align: 'center' });
    doc.fontSize(10).fillColor('#fff')
       .text(`Term ${term}  ·  Academic Year ${year}`, 50, 65, { align: 'center' });

    // ── Student info box ──
    doc.rect(50, 105, 495, 70).fill('#F4F6F9').stroke('#E5E8EC');
    doc.fontSize(10).fillColor('#1A252F').font('Helvetica-Bold');
    doc.text('STUDENT INFORMATION', 65, 115);
    doc.font('Helvetica').fontSize(10).fillColor('#566573');
    doc.text(`Name:`, 65, 132);
    doc.text(`Adm No:`, 65, 147);
    doc.fillColor('#1A252F').font('Helvetica-Bold');
    doc.text(`${student.first_name} ${student.last_name}`, 120, 132);
    doc.text(`${student.adm_no}`, 120, 147);
    doc.font('Helvetica').fillColor('#566573');
    doc.text(`Class:`, 320, 132);
    doc.text(`Gender:`, 320, 147);
    doc.fillColor('#1A252F').font('Helvetica-Bold');
    doc.text(`${student.class_name}`, 380, 132);
    doc.text(`${student.gender}`, 380, 147);

    // ── Scores table ──
    const tableTop = 195;
    doc.rect(50, tableTop, 495, 22).fill('#1B4F72');
    doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold');
    doc.text('SUBJECT',        65,  tableTop + 7);
    doc.text('CAT (30)',      285,  tableTop + 7);
    doc.text('EXAM (70)',     340,  tableTop + 7);
    doc.text('TOTAL (100)',   400,  tableTop + 7);
    doc.text('GRADE',         470,  tableTop + 7);

    let y = tableTop + 22;
    scores.forEach((s, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
      doc.rect(50, y, 495, 20).fill(bg);
      const g = getGradeInfo(Number(s.total_score), scale);
      doc.fontSize(9).fillColor('#1A252F').font('Helvetica');
      doc.text(s.subject_name,       65,  y + 6);
      doc.text(String(s.cat_score),  285, y + 6);
      doc.text(String(s.exam_score), 340, y + 6);
      doc.text(String(s.total_score),400, y + 6);
      doc.font('Helvetica-Bold').fillColor(
        g?.grade === 'A' ? '#1E8449' : g?.grade?.startsWith('B') ? '#1B4F72' : '#C0392B'
      ).text(g?.grade || 'E', 470, y + 6);
      y += 20;
    });

    // ── Summary box ──
    y += 15;
    doc.rect(50, y, 495, 55).fill('#1B4F72');
    doc.fontSize(10).fillColor('#fff').font('Helvetica-Bold');
    doc.text('PERFORMANCE SUMMARY', 65, y + 8);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Total Marks: ${totalMarks}`, 65,  y + 24);
    doc.text(`Average:     ${avg}%`,        200, y + 24);
    doc.text(`Grade:       ${gradeInfo?.grade}`, 340, y + 24);
    doc.text(`Position:    ${position} / ${totalStudents}`, 65,  y + 40);
    doc.text(`Remarks:     ${gradeInfo?.remark}`,           200, y + 40);

    // ── Grading scale ──
    y += 75;
    doc.fontSize(9).fillColor('#566573').font('Helvetica-Bold')
       .text('GRADING SCALE', 50, y);
    y += 12;
    scale.forEach((g, i) => {
      doc.rect(50 + i * 70, y, 65, 28).fill('#F4F6F9').stroke('#E5E8EC');
      doc.fontSize(11).fillColor('#1B4F72').font('Helvetica-Bold')
         .text(g.grade, 50 + i * 70 + 8, y + 4);
      doc.fontSize(7).fillColor('#566573').font('Helvetica')
         .text(`${g.min_score}-${g.max_score}%`, 50 + i * 70 + 8, y + 17);
    });

    // ── Footer ──
    doc.fontSize(8).fillColor('#8898A4')
       .text('This is an official document of Ikonex Academy. Generated on ' + new Date().toLocaleDateString(),
             50, 760, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Class performance PDF report ──
router.get('/class/:classId', async (req, res) => {
  const { term, year } = req.query;
  try {
    const [[cls]] = await db.query('SELECT * FROM class_streams WHERE id = ?', [req.params.classId]);
    const [students] = await db.query('SELECT * FROM students WHERE class_id = ? ORDER BY last_name', [req.params.classId]);
    const [scale] = await db.query('SELECT * FROM grading_scale ORDER BY min_score DESC');

    const [allScores] = await db.query(`
      SELECT sc.*, sub.name as subject_name
      FROM scores sc
      INNER JOIN subjects sub ON sub.id = sc.subject_id
      INNER JOIN students s ON s.id = sc.student_id
      WHERE s.class_id = ? AND sc.term = ? AND sc.year = ?
    `, [req.params.classId, term, year]);

    const results = students.map(student => {
      const scores = allScores.filter(sc => sc.student_id === student.id);
      const totalMarks = scores.reduce((a, s) => a + Number(s.total_score), 0);
      const avg = scores.length ? parseFloat((totalMarks / scores.length).toFixed(1)) : 0;
      const gradeInfo = getGradeInfo(avg, scale);
      return { student, totalMarks, average: avg, grade: gradeInfo?.grade || '-', remark: gradeInfo?.remark || '-', subjectCount: scores.length };
    }).sort((a, b) => b.average - a.average).map((r, i) => ({ ...r, position: i + 1 }));

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ClassReport_${cls.name}_T${term}_${year}.pdf`);
    doc.pipe(res);

    // ── Header ──
    doc.rect(0, 0, 842, 80).fill('#1B4F72');
    doc.fontSize(20).fillColor('#fff').font('Helvetica-Bold')
       .text('IKONEX ACADEMY', 50, 15, { align: 'center' });
    doc.fontSize(11).fillColor('#E67E22')
       .text(`Class Performance Report — ${cls.name} · Term ${term} · ${year}`, 50, 42, { align: 'center' });
    doc.fontSize(9).fillColor('#fff').font('Helvetica')
       .text(`Generated: ${new Date().toLocaleDateString()}   Total Students: ${students.length}`, 50, 60, { align: 'center' });

    // ── Table header ──
    const top = 100;
    doc.rect(50, top, 742, 22).fill('#2E86C1');
    doc.fontSize(8).fillColor('#fff').font('Helvetica-Bold');
    doc.text('POS',   55,  top + 7);
    doc.text('NAME',  90,  top + 7);
    doc.text('ADM NO',280, top + 7);
    doc.text('SUBJECTS', 350, top + 7);
    doc.text('TOTAL',    430, top + 7);
    doc.text('AVERAGE',  500, top + 7);
    doc.text('GRADE',    580, top + 7);
    doc.text('REMARKS',  630, top + 7);

    let y = top + 22;
    results.forEach((r, i) => {
      if (y > 520) { doc.addPage({ layout: 'landscape' }); y = 50; }
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F4F6F9';
      doc.rect(50, y, 742, 20).fill(bg);
      doc.fontSize(8).fillColor('#1A252F').font('Helvetica-Bold');
      doc.text(String(r.position),   55,  y + 6);
      doc.font('Helvetica');
      doc.text(`${r.student.first_name} ${r.student.last_name}`, 90, y + 6, { width: 185 });
      doc.text(r.student.adm_no,     280, y + 6);
      doc.text(String(r.subjectCount),355, y + 6);
      doc.text(String(r.totalMarks), 430, y + 6);
      doc.text(`${r.average}%`,      500, y + 6);
      doc.font('Helvetica-Bold').fillColor(
        r.grade === 'A' ? '#1E8449' : r.grade.startsWith('B') ? '#1B4F72' : '#C0392B'
      ).text(r.grade, 580, y + 6);
      doc.font('Helvetica').fillColor('#566573').text(r.remark, 630, y + 6);
      y += 20;
    });

    // ── Class summary ──
    y += 15;
    const classAvg = results.length
      ? parseFloat((results.reduce((a, r) => a + r.average, 0) / results.length).toFixed(1)) : 0;
    doc.rect(50, y, 742, 30).fill('#1B4F72');
    doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold');
    doc.text(`Class Average: ${classAvg}%`, 65, y + 10);
    doc.text(`Top Student: ${results[0]?.student.first_name} ${results[0]?.student.last_name} (${results[0]?.average}%)`, 250, y + 10);
    doc.text(`Pass Rate: ${Math.round(results.filter(r => r.average >= 40).length / results.length * 100)}%`, 600, y + 10);

    doc.end();
  } catch (err) {
    console.error('Class PDF error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;