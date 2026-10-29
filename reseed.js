/*
 * Destructive reseed: wipes the app collections (and the legacy `cards` and
 * `classes` collections), then inserts demo data.
 *
 *   node seed/reseed.js
 *
 * Demo login: metoo / ucf123!
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  User, Department, Term, Course, Instructor, Section, Enrollment, Program
} = require('./models');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/AppDB';

async function run() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reseed when NODE_ENV=production');
  }
  await mongoose.connect(url);

  // --- wipe -------------------------------------------------------------
  for (const legacy of ['cards', 'classes']) {
    try { await mongoose.connection.db.dropCollection(legacy); } catch (e) { /* not there */ }
  }
  for (const M of [Enrollment, Section, Program, Course, Instructor, Term, Department, User]) {
    await M.deleteMany({});
    await M.syncIndexes();
  }

  // --- departments ------------------------------------------------------
  const cs = await Department.create({ code: 'CS', name: 'Computer Science' });
  const math = await Department.create({ code: 'MAT', name: 'Mathematics' });

  // --- terms ------------------------------------------------------------
  const spring26 = await Term.create({
    name: 'Spring 2026', year: 2026, season: 'spring',
    startDate: new Date('2026-01-12'), endDate: new Date('2026-05-01'),
    registrationOpens: new Date('2025-11-03'), registrationCloses: new Date('2026-01-23')
  });
  const spring27 = await Term.create({
    name: 'Spring 2027', year: 2027, season: 'spring',
    startDate: new Date('2027-01-11'), endDate: new Date('2027-04-30'),
    registrationOpens: new Date('2026-11-02'), registrationCloses: new Date('2027-01-22')
  });

  // --- courses (created in dependency order so prereqs can reference ids) -
  const c = {};
  const leaf = (code, minGrade, concurrentOk) => {
    const n = { courseId: c[code]._id };
    if (minGrade) n.minGrade = minGrade;
    if (concurrentOk) n.concurrentOk = true;
    return n;
  };
  const mk = async (subject, number, title, credits, dept, extra = {}) => {
    c[subject + number] = await Course.create({
      subject, number, title, credits, departmentId: dept._id, ...extra
    });
  };

  await mk('MAC', '2311', 'Calculus I', 4, math, { attributes: ['GenEd-Math'] });
  await mk('COP', '3502', 'Computer Science I', 3, cs);
  await mk('COP', '3502L', 'Computer Science I Lab', 1, cs);
  await Course.updateOne({ _id: c.COP3502._id }, { coreqs: [c.COP3502L._id] });
  await Course.updateOne({ _id: c.COP3502L._id }, { coreqs: [c.COP3502._id] });
  await mk('COP', '3503', 'Computer Science II', 3, cs, {
    prereqs: leaf('COP3502', 'C')
  });
  await mk('COT', '3100', 'Discrete Structures', 3, cs, {
    prereqs: { op: 'OR', items: [leaf('MAC2311', 'C', true), { courseId: c.COP3502._id, minGrade: 'C' }] }
  });
  await mk('COP', '4331', 'Processes for Object-Oriented Software Development', 3, cs, {
    attributes: ['Writing Intensive'],
    prereqs: { op: 'AND', items: [leaf('COP3503', 'C'), leaf('COT3100')] },
    prereqText: 'Junior standing'
  });

  // --- instructors ------------------------------------------------------
  const aedo = await Instructor.create({
    firstName: 'John', lastName: 'Aedo', email: 'john.aedo@example.edu',
    title: 'Associate Professor', departmentId: cs._id
  });
  const raman = await Instructor.create({
    firstName: 'Priya', lastName: 'Raman', email: 'priya.raman@example.edu',
    title: 'Assistant Professor', departmentId: cs._id
  });
  const ortiz = await Instructor.create({
    firstName: 'Mateo', lastName: 'Ortiz', email: 'mateo.ortiz@example.edu',
    title: 'Professor', departmentId: math._id
  });

  // --- users ------------------------------------------------------------
  const pw = bcrypt.hashSync('ucf123!', 10);
  const metoo = await User.create({
    firstName: 'Me', lastName: 'Too', login: 'metoo', password: pw, role: 'student'
  });
  const s1 = await User.create({ firstName: 'Sam', lastName: 'One', login: 'student1', password: pw });
  const s2 = await User.create({ firstName: 'Sky', lastName: 'Two', login: 'student2', password: pw });
  await User.create({ firstName: 'Ada', lastName: 'Advisor', login: 'advisor1', password: pw, role: 'advisor' });

  // --- sections ---------------------------------------------------------
  let crn = 10000;
  const sec = (course, term, num, instr, meetings, capacity, extra = {}) =>
    Section.create({
      courseId: c[course]._id, termId: term._id, sectionNumber: num, crn: String(crn++),
      instructorIds: instr.map((i) => i._id), meetings, capacity, ...extra
    });
  const mt = (days, start, end, building, room) => ({ days, startMinute: start, endMinute: end, building, room });

  // past term (closed): history for the degree audit
  const past = { status: 'closed' };
  const pMac = await sec('MAC2311', spring26, '0001', [ortiz], [mt(['M', 'W', 'F'], 540, 590, 'MAP', '101')], 80, past);
  const pCop2 = await sec('COP3502', spring26, '0001', [aedo], [mt(['T', 'R'], 540, 615, 'HEC', '125')], 60, past);
  const pCop3 = await sec('COP3503', spring26, '0001', [raman], [mt(['M', 'W'], 780, 855, 'HEC', '125')], 50, past);
  const pDisc = await sec('COT3100', spring26, '0001', [raman], [mt(['T', 'R'], 720, 795, 'CB1', '110')], 50, past);

  // upcoming term: COP4331 section 0001 is full with a waitlist, 0002 is open
  const full = await sec('COP4331', spring27, '0001', [aedo], [mt(['M', 'W'], 630, 705, 'HEC', '101')], 2, {
    enrolledCount: 2, waitlistCapacity: 5, waitlistCount: 1
  });
  await sec('COP4331', spring27, '0002', [raman], [mt(['T', 'R'], 810, 885, 'HEC', '103')], 40, {
    waitlistCapacity: 5
  });
  await sec('COP3502', spring27, '0001', [aedo], [mt(['M', 'W', 'F'], 600, 650, 'HEC', '125')], 60);
  await sec('MAC2311', spring27, '0001', [ortiz], [mt(['M', 'W', 'F'], 540, 590, 'MAP', '101')], 80);

  // --- enrollments ------------------------------------------------------
  const done = (student, section, grade) => ({
    studentId: student._id, sectionId: section._id, courseId: section.courseId,
    termId: section.termId, status: 'completed', grade
  });
  await Enrollment.create([
    done(metoo, pMac, 'A'), done(metoo, pCop2, 'B'), done(metoo, pCop3, 'B'), done(metoo, pDisc, 'A'),
    { studentId: s1._id, sectionId: full._id, courseId: full.courseId, termId: full.termId, status: 'enrolled' },
    { studentId: s2._id, sectionId: full._id, courseId: full.courseId, termId: full.termId, status: 'enrolled' },
    { studentId: metoo._id, sectionId: full._id, courseId: full.courseId, termId: full.termId, status: 'waitlisted' }
  ]);

  // --- programs and declarations ---------------------------------------
  const csMajor = await Program.create({
    name: 'Computer Science', type: 'major', degree: 'BS', departmentId: cs._id,
    catalogYear: 2025, totalCredits: 120,
    requirements: [
      { name: 'Core', rule: 'all', courseIds: [c.COP3502._id, c.COP3502L._id, c.COP3503._id, c.COT3100._id, c.COP4331._id] },
      { name: 'Calculus', rule: 'all', courseIds: [c.MAC2311._id] },
      { name: 'Upper-level CS electives', rule: 'anyN', n: 2, filter: { subject: 'COP', minLevel: 4000 } }
    ]
  });
  const mathMinor = await Program.create({
    name: 'Mathematics', type: 'minor', departmentId: math._id, catalogYear: 2025, totalCredits: 18,
    requirements: [
      { name: 'Math coursework', rule: 'minCredits', credits: 7, courseIds: [c.MAC2311._id, c.COT3100._id] }
    ]
  });
  await User.updateOne(
    { _id: metoo._id },
    { $set: { declarations: [
      { programId: csMajor._id, catalogYear: 2025 },
      { programId: mathMinor._id, catalogYear: 2025 }
    ] } }
  );

  const counts = {};
  for (const [name, M] of Object.entries({ User, Department, Term, Course, Instructor, Section, Enrollment, Program })) {
    counts[name] = await M.countDocuments();
  }
  console.log('Reseed complete:', counts);
}

run()
  .catch((err) => { console.error('Reseed failed:', err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
