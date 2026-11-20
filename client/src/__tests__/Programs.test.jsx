import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getTerms: vi.fn(),
  getPrograms: vi.fn(),
  getProgram: vi.fn(),
  getCourse: vi.fn(),
  getAllCourses: vi.fn(),
  getDepartments: vi.fn(),
}));

const course = (id, subject, number, title, credits, extra = {}) => ({
  _id: id,
  subject,
  number,
  code: subject + number,
  title,
  credits,
  ...extra,
});
const COP3502 = course('c3502', 'COP', '3502', 'Computer Science I', 3);
const COP3503 = course('c3503', 'COP', '3503', 'Computer Science II', 3);
const COP4331 = course('c4331', 'COP', '4331', 'Processes for OO Software Development', 3);
const COP4600 = course('c4600', 'COP', '4600', 'Operating Systems', 3);
const MAC2311 = course('c2311', 'MAC', '2311', 'Calculus I', 4);
const COURSES = [COP3502, COP3503, COP4331, COP4600, MAC2311];

const CS = { _id: 'd1', code: 'CS', name: 'Computer Science' };

const CS_MAJOR = {
  _id: 'pcs',
  name: 'Computer Science',
  type: 'major',
  degree: 'BS',
  departmentId: 'd1',
  catalogYear: 2025,
  totalCredits: 120,
  requirements: [
    { _id: 'r1', name: 'Core', rule: 'all', courseIds: ['c3502', 'c3503'] },
    { _id: 'r2', name: 'Upper-level CS electives', rule: 'anyN', n: 2, filter: { subject: 'COP', minLevel: 4000 } },
  ],
};
const MATH_MINOR = {
  _id: 'pmath',
  name: 'Mathematics',
  type: 'minor',
  catalogYear: 2025,
  totalCredits: 18,
  requirements: [{ _id: 'r3', name: 'Math coursework', rule: 'minCredits', credits: 7, courseIds: ['c2311', 'gone'] }],
};
const CERT = { _id: 'pcert', name: 'Cybersecurity', type: 'certificate', catalogYear: 2026, requirements: [] };

function login() {
  localStorage.setItem('auth', JSON.stringify(SESSION));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getPrograms.mockResolvedValue([CS_MAJOR, MATH_MINOR, CERT]);
  api.getProgram.mockImplementation(async (id) => {
    const p = [CS_MAJOR, MATH_MINOR, CERT].find((x) => x._id === id);
    if (!p) throw Object.assign(new Error('Program not found with that ID'), { status: 404 });
    return p;
  });
  api.getCourse.mockImplementation(async (id) => {
    const c = COURSES.find((x) => x._id === id);
    if (!c) throw Object.assign(new Error('Course not found with that ID'), { status: 404 });
    return c;
  });
  // backend filters by subject; the page checks the level itself
  api.getAllCourses.mockImplementation(async ({ subject }) => COURSES.filter((c) => !subject || c.subject === subject));
  api.getDepartments.mockResolvedValue([CS]);
});

describe('Programs list', () => {
  it('groups programs by type with credits and requirement counts', async () => {
    login();
    renderApp('/programs');

    const majors = (await screen.findByRole('heading', { name: 'Majors' })).closest('section');
    const cs = within(majors).getByRole('link', { name: /Computer Science/ });
    expect(cs).toHaveAttribute('href', '/programs/pcs');
    expect(cs).toHaveTextContent('BS');
    expect(cs.closest('li')).toHaveTextContent('120 credits · 2 requirements');

    const minors = screen.getByRole('heading', { name: 'Minors' }).closest('section');
    expect(within(minors).getByRole('link', { name: 'Mathematics' })).toBeInTheDocument();

    const certs = screen.getByRole('heading', { name: 'Certificates' }).closest('section');
    expect(certs).toHaveTextContent('Cybersecurity');
    expect(certs).toHaveTextContent('0 requirements');

    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Programs' })).toHaveClass(
      'active'
    );
  });

  it('says when there are no programs', async () => {
    api.getPrograms.mockResolvedValue([]);
    login();
    renderApp('/programs');

    expect(await screen.findByText('No programs have been added yet.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Majors' })).not.toBeInTheDocument();
  });
});

describe('Program detail', () => {
  it('opens from the list and explains each requirement with course links', async () => {
    login();
    renderApp('/programs');
    await userEvent.click(await screen.findByRole('link', { name: /Computer Science/ }));

    expect(await screen.findByRole('heading', { name: 'Computer Science', level: 1 })).toBeInTheDocument();
    const info = screen.getByRole('heading', { name: 'Program Information' }).closest('section');
    expect(info).toHaveTextContent('BS major');
    expect(info).toHaveTextContent('120');
    expect(await within(info).findByText('Computer Science')).toBeInTheDocument(); // department name

    const core = screen.getByRole('heading', { name: 'Core' }).closest('section');
    expect(core).toHaveTextContent('Complete all of these courses');
    expect(core).toHaveTextContent('6 credits total');
    expect(within(core).getByRole('link', { name: 'COP3502' })).toHaveAttribute('href', '/catalog/c3502');
    expect(within(core).getByRole('link', { name: 'COP3503' })).toBeInTheDocument();

    const electives = screen.getByRole('heading', { name: 'Upper-level CS electives' }).closest('section');
    expect(electives).toHaveTextContent('Choose 2 courses');
    expect(electives).toHaveTextContent('From any COP course at the 4000 level or above.');
    // only 4000+ COP courses qualify
    expect(within(electives).getByRole('link', { name: 'COP4331' })).toBeInTheDocument();
    expect(within(electives).getByRole('link', { name: 'COP4600' })).toBeInTheDocument();
    expect(within(electives).queryByRole('link', { name: 'COP3502' })).not.toBeInTheDocument();
    expect(api.getAllCourses).toHaveBeenCalledWith({ subject: 'COP', attribute: undefined }, 'fake.jwt.token');
  });

  it('describes credit-based rules and notes courses missing from the catalog', async () => {
    login();
    renderApp('/programs/pmath');

    const req = (await screen.findByRole('heading', { name: 'Math coursework' })).closest('section');
    expect(req).toHaveTextContent('Earn at least 7 credits');
    expect(req).toHaveTextContent('From these courses:');
    expect(within(req).getByRole('link', { name: 'MAC2311' })).toBeInTheDocument();
    expect(req).toHaveTextContent('1 listed course could not be found in the catalog.');
    expect(api.getDepartments).not.toHaveBeenCalled(); // no departmentId on this program
  });

  it('handles a program with no requirements', async () => {
    login();
    renderApp('/programs/pcert');

    expect(await screen.findByText('This program has no requirements listed yet.')).toBeInTheDocument();
  });

  it('shows a not-found error for a bad id', async () => {
    login();
    renderApp('/programs/nope');

    expect(await screen.findByRole('alert')).toHaveTextContent('Program not found with that ID');
    expect(screen.getByRole('link', { name: '← Programs' })).toBeInTheDocument();
  });

  it('logs out when the token has expired', async () => {
    api.getProgram.mockRejectedValue(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
    login();
    renderApp('/programs/pcs');

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });
});
