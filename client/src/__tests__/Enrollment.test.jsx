import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getTerms: vi.fn(),
  getPrograms: vi.fn().mockResolvedValue([]),
  getProgram: vi.fn(),
  getCourse: vi.fn(),
  getCourses: vi.fn(),
  getSections: vi.fn(),
  getResource: vi.fn(),
  getAllResource: vi.fn(),
  getAllSections: vi.fn(),
  getAllEnrollments: vi.fn(),
  registerForSection: vi.fn(),
  dropEnrollment: vi.fn(),
  gradeEnrollment: vi.fn(),
}));

const TOKEN = SESSION.token;
const DAY = 86400000;
const iso = (d) => new Date(Date.now() + d * DAY).toISOString();
const OPEN_TERM = {
  _id: 't27',
  name: 'Spring 2027',
  startDate: iso(55),
  endDate: iso(165),
  registrationOpens: iso(-15),
  registrationCloses: iso(66),
};
const UPCOMING_TERM = { ...OPEN_TERM, _id: 't28', name: 'Fall 2027', startDate: iso(250), registrationOpens: iso(100), registrationCloses: iso(200) };

const course = (id, code, title, credits = 3) => ({ _id: id, code, title, credits });
const COP4331 = course('c4331', 'COP4331', 'Processes for OO Software Development');
const COP3502 = course('c3502', 'COP3502', 'Computer Science I');
const MAC2311 = course('c2311', 'MAC2311', 'Calculus I', 4);

const section = (id, crn, num, crs, extra = {}) => ({
  _id: id,
  crn,
  sectionNumber: num,
  courseId: crs,
  termId: { _id: 't27', name: 'Spring 2027' },
  instructorIds: [{ firstName: 'John', lastName: 'Aedo' }],
  meetings: [{ days: ['M', 'W'], startMinute: 630, endMinute: 705, building: 'HEC', room: '101' }],
  modality: 'in-person',
  capacity: 40,
  enrolledCount: 0,
  waitlistCapacity: 5,
  waitlistCount: 0,
  status: 'open',
  ...extra,
});
const S_OPEN = section('s1', '10005', '0002', COP4331);
const S_FULL = section('s2', '10004', '0001', COP4331, { capacity: 2, enrolledCount: 2, waitlistCount: 1 });
const S_STUFFED = section('s3', '10009', '0003', COP4331, { capacity: 2, enrolledCount: 2, waitlistCapacity: 1, waitlistCount: 1 });
const S_MINE = section('s4', '10006', '0001', COP3502);

const enrollment = (id, sec, status, extra = {}) => ({
  _id: id,
  status,
  sectionId: sec,
  courseId: sec.courseId,
  termId: { _id: 't27', name: 'Spring 2027', startDate: OPEN_TERM.startDate },
  studentId: { _id: 'abc123', firstName: 'Ada', lastName: 'Lovelace', login: 'ada' },
  ...extra,
});

function loginAs(role = 'student') {
  localStorage.setItem('auth', JSON.stringify({ ...SESSION, role }));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getTerms.mockResolvedValue([OPEN_TERM]);
  api.getSections.mockResolvedValue({ items: [S_OPEN, S_FULL, S_STUFFED, S_MINE], total: 4, page: 1, limit: 25 });
  api.getAllEnrollments.mockResolvedValue([enrollment('e-mine', S_MINE, 'enrolled')]);
  api.getUser.mockResolvedValue({ _id: 'abc123', firstName: 'Ada', lastName: 'Lovelace', login: 'ada', role: 'student', declarations: [] });
});

describe('Registering from class search', () => {
  it('offers Register, Join waitlist, Full, and shows what the student already holds', async () => {
    loginAs();
    renderApp('/classes');

    const row = async (crn) => screen.findByRole('row', { name: new RegExp(crn) });
    expect(within(await row('10005')).getByRole('button', { name: 'Register for COP4331 section 0002' })).toBeEnabled();
    // seats are full and one person waits: the button joins the waitlist
    expect(within(await row('10004')).getByRole('button', { name: 'Join waitlist for COP4331 section 0001' })).toBeInTheDocument();
    const stuffed = await row('10009'); // seats and waitlist both full
    expect(stuffed.cells[stuffed.cells.length - 1]).toHaveTextContent('Full');
    expect(within(stuffed).queryByRole('button')).toBeNull();
    await waitFor(() => expect(within(screen.getByRole('row', { name: /10006/ })).getByText('Enrolled')).toBeInTheDocument());
  });

  it('points to the section already held instead of offering another section of the same course', async () => {
    api.getAllEnrollments.mockResolvedValue([
      enrollment('e-w', S_FULL, 'waitlisted', { waitlistPosition: 1, sectionId: { ...S_FULL, termId: { _id: 't27' } } }),
    ]);
    loginAs();
    renderApp('/classes');

    const other = await screen.findByRole('row', { name: /10005/ });
    await waitFor(() => expect(within(other).getByText('Waitlisted in 0001')).toBeInTheDocument());
    expect(within(other).queryByRole('button')).toBeNull();
    expect(within(screen.getByRole('row', { name: /10004/ })).getByText('Waitlisted #1')).toBeInTheDocument();
  });

  it('registers, shows the result and any corequisite note, and refreshes seats', async () => {
    api.registerForSection.mockResolvedValue({
      ...enrollment('e-new', S_OPEN, 'enrolled'),
      warnings: ['COP4331L is a corequisite of COP4331; register for it this term too'],
    });
    loginAs();
    renderApp('/classes');
    const row = await screen.findByRole('row', { name: /10005/ });

    await userEvent.click(within(row).getByRole('button', { name: /Register for COP4331/ }));

    expect(api.registerForSection).toHaveBeenCalledWith('s1', TOKEN);
    const banner = (await screen.findByText(/You're registered/)).closest('.alert');
    expect(banner).toHaveTextContent("You're registered for COP4331 section 0002.");
    expect(banner).toHaveTextContent('Note: COP4331L is a corequisite');
    await waitFor(() => expect(api.getSections).toHaveBeenCalledTimes(2)); // seat counts reloaded
    expect(api.getAllEnrollments).toHaveBeenCalledTimes(2);
  });

  it('explains a waitlist placement', async () => {
    api.registerForSection.mockResolvedValue({ ...enrollment('e-w', S_FULL, 'waitlisted'), waitlistPosition: 2, warnings: [] });
    loginAs();
    renderApp('/classes');
    const row = await screen.findByRole('row', { name: /10004/ });

    await userEvent.click(within(row).getByRole('button', { name: /Join waitlist/ }));

    expect(await screen.findByText(/You're #2 on the waitlist/)).toBeInTheDocument();
  });

  it('shows why a registration was refused, including missing prerequisites', async () => {
    api.registerForSection.mockRejectedValue(
      Object.assign(new Error('Prerequisites not met'), {
        status: 409,
        details: { prereqs: 'Requires COP3503 (C or better) and COT3100' },
      })
    );
    loginAs();
    renderApp('/classes');
    const row = await screen.findByRole('row', { name: /10005/ });

    await userEvent.click(within(row).getByRole('button', { name: /Register for COP4331/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't register for COP4331 section 0002: Prerequisites not met");
    expect(alert).toHaveTextContent('Requires COP3503 (C or better) and COT3100.');
  });

  it('says when registration has not opened yet', async () => {
    api.getTerms.mockResolvedValue([UPCOMING_TERM]);
    loginAs();
    renderApp('/classes');

    const row = await screen.findByRole('row', { name: /10005/ });
    expect(within(row).getByText(/^Opens /)).toBeInTheDocument();
    expect(within(row).queryByRole('button')).toBeNull();
  });

  it('has no Register column for non-students', async () => {
    loginAs('advisor');
    renderApp('/classes');

    await screen.findByRole('row', { name: /10005/ });
    expect(screen.queryByRole('columnheader', { name: 'Register' })).toBeNull();
    expect(api.getAllEnrollments).not.toHaveBeenCalled();
  });
});

describe('Student home: schedule and waitlists', () => {
  beforeEach(() => {
    api.getAllEnrollments.mockResolvedValue([
      enrollment('e1', S_MINE, 'enrolled'),
      enrollment('e2', section('s5', '10007', '0001', MAC2311), 'enrolled'),
      enrollment('e3', S_FULL, 'waitlisted', { waitlistPosition: 2 }),
      enrollment('e4', section('s6', '9000', '0001', course('cx', 'COT3100', 'Discrete')), 'completed', { grade: 'A' }),
    ]);
  });

  it('lists enrolled classes with credits and waitlist positions', async () => {
    loginAs();
    renderApp('/home');

    const schedule = (await screen.findByRole('heading', { name: 'My Schedule' })).closest('section');
    expect(await within(schedule).findByRole('heading', { name: /Spring 2027/ })).toHaveTextContent('7 credits');
    expect(within(schedule).getByRole('link', { name: 'COP3502' })).toBeInTheDocument();
    expect(schedule).toHaveTextContent('MW 10:30 AM – 11:45 AM, HEC 101');
    expect(schedule).not.toHaveTextContent('COT3100'); // completed, not on the schedule

    const waitlists = screen.getByRole('heading', { name: 'Waitlists' }).closest('section');
    expect(waitlists).toHaveTextContent('COP4331');
    expect(waitlists).toHaveTextContent('#2 in line');
  });

  it('drops a class after confirmation and reloads', async () => {
    api.dropEnrollment.mockResolvedValue({});
    loginAs();
    renderApp('/home');
    const schedule = (await screen.findByRole('heading', { name: 'My Schedule' })).closest('section');

    await userEvent.click(await within(schedule).findByRole('button', { name: 'Drop COP3502 section 0001' }));
    expect(api.dropEnrollment).not.toHaveBeenCalled();
    await userEvent.click(within(schedule).getByRole('button', { name: 'Yes, drop' }));

    expect(api.dropEnrollment).toHaveBeenCalledWith('e1', TOKEN);
    expect(await within(schedule).findByText('Dropped COP3502 section 0001.')).toBeInTheDocument();
    await waitFor(() => expect(api.getAllEnrollments).toHaveBeenCalledTimes(2));
  });

  it('shows why a drop was refused', async () => {
    api.dropEnrollment.mockRejectedValue(
      Object.assign(new Error('Registration for Spring 2027 is closed; ask an admin to withdraw you'), { status: 409 })
    );
    loginAs();
    renderApp('/home');
    const waitlists = (await screen.findByRole('heading', { name: 'Waitlists' })).closest('section');

    await userEvent.click(await within(waitlists).findByRole('button', { name: 'Leave waitlist COP4331 section 0001' }));
    await userEvent.click(within(waitlists).getByRole('button', { name: 'Yes, leave waitlist' }));

    expect(await within(waitlists).findByRole('alert')).toHaveTextContent('ask an admin to withdraw you');
  });

  it('shows degree progress for declared programs', async () => {
    api.getUser.mockResolvedValue({
      _id: 'abc123', firstName: 'Ada', lastName: 'Lovelace', login: 'ada', role: 'student',
      declarations: [{ programId: 'pcs', catalogYear: 2025 }],
    });
    api.getProgram.mockResolvedValue({
      _id: 'pcs', name: 'Computer Science', totalCredits: 120,
      requirements: [{ name: 'Core', rule: 'all', courseIds: ['c3502', 'cx'] }],
    });
    loginAs();
    renderApp('/home');

    const card = (await screen.findByRole('heading', { name: 'Degree Progress' })).closest('section');
    expect(await within(card).findByRole('link', { name: 'Computer Science' })).toHaveAttribute('href', '/programs/pcs');
    expect(card).toHaveTextContent('3 of 120 credits earned');
    expect(card).toHaveTextContent('1 / 2 courses');
    expect(card).toHaveTextContent('1 in progress');
    expect(within(card).getByRole('progressbar', { name: 'Core progress' })).toHaveAttribute('aria-valuenow', '1');
  });
});

describe('Instructor roster', () => {
  const ROSTER = [
    enrollment('r1', S_FULL, 'enrolled', { studentId: { _id: 'u1', firstName: 'Sam', lastName: 'One', login: 'student1' } }),
    enrollment('r2', S_FULL, 'completed', { grade: 'B', studentId: { _id: 'u2', firstName: 'Sky', lastName: 'Two', login: 'student2' } }),
    enrollment('r3', S_FULL, 'waitlisted', { waitlistPosition: 1, studentId: { _id: 'u3', firstName: 'Me', lastName: 'Too', login: 'metoo' } }),
    enrollment('r4', S_FULL, 'dropped', { studentId: { _id: 'u4', firstName: 'Old', lastName: 'Drop', login: 'gone' } }),
  ];

  beforeEach(() => {
    api.getResource.mockResolvedValue({ ...S_FULL, termId: { _id: 't27', name: 'Spring 2027' } });
    api.getAllEnrollments.mockResolvedValue(ROSTER);
    api.gradeEnrollment.mockResolvedValue({});
  });

  it('lists students by status and hides dropped ones until asked', async () => {
    loginAs('instructor');
    renderApp('/teaching/s2');

    expect(await screen.findByRole('heading', { name: 'COP4331 section 0001' })).toBeInTheDocument();
    expect(api.getAllEnrollments).toHaveBeenCalledWith({ sectionId: 's2' }, TOKEN);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => r.cells[0].textContent)).toEqual(['One, Sam', 'Two, Sky', 'Too, Me']);
    expect(rows[2]).toHaveTextContent('Waitlisted #1');
    expect(screen.getByText('2 / 2 seats')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Show dropped and withdrawn'));
    expect(screen.getByRole('row', { name: /gone/ })).toHaveTextContent('Dropped');
  });

  it('submits a grade for an enrolled student and updates a recorded one', async () => {
    loginAs('instructor');
    renderApp('/teaching/s2');
    await screen.findByRole('heading', { name: 'COP4331 section 0001' });

    await userEvent.click(screen.getByRole('button', { name: 'Submit grade for One, Sam' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a grade.');
    await userEvent.selectOptions(screen.getByLabelText('Grade for One, Sam'), 'A-');
    await userEvent.click(screen.getByRole('button', { name: 'Submit grade for One, Sam' }));
    expect(api.gradeEnrollment).toHaveBeenCalledWith('r1', { status: 'completed', grade: 'A-' }, TOKEN);
    expect(await screen.findByText("Recorded One, Sam's grade: A-.")).toBeInTheDocument();

    const update = screen.getByRole('button', { name: 'Update grade for Two, Sky' });
    expect(update).toBeDisabled(); // unchanged
    await userEvent.selectOptions(screen.getByLabelText('Grade for Two, Sky'), 'B+');
    await userEvent.click(update);
    expect(api.gradeEnrollment).toHaveBeenCalledWith('r2', { grade: 'B+' }, TOKEN);
  });

  it("shows the API's refusal when the section isn't theirs", async () => {
    api.getAllEnrollments.mockRejectedValue(Object.assign(new Error('You do not teach this section'), { status: 403 }));
    loginAs('instructor');
    renderApp('/teaching/s2');

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not teach this section');
  });
});
