import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  getAllEnrollments: vi.fn().mockResolvedValue([]),
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getPrograms: vi.fn(),
  getDepartments: vi.fn(),
  getCourses: vi.fn(),
  getCourse: vi.fn(),
  getTerms: vi.fn(),
  getAllSections: vi.fn(),
}));

const CS = { _id: 'd1', code: 'CS', name: 'Computer Science' };
const MATH = { _id: 'd2', code: 'MAT', name: 'Mathematics' };

const COP3503 = { _id: 'c3503', code: 'COP3503', title: 'Computer Science II', credits: 3, departmentId: CS };
const COT3100 = { _id: 'c3100', code: 'COT3100', title: 'Discrete Structures', credits: 3, departmentId: CS };
const COP4331 = {
  _id: 'c4331',
  code: 'COP4331',
  title: 'Processes for Object-Oriented Software Development',
  credits: 3,
  departmentId: CS,
  attributes: ['Writing Intensive'],
  description: 'Team software projects.',
  prereqs: { op: 'AND', items: [{ courseId: 'c3503', minGrade: 'C' }, { courseId: 'c3100' }] },
  prereqText: 'Junior standing',
  coreqs: [],
};
const MAC2311 = {
  _id: 'c2311',
  code: 'MAC2311',
  title: 'Calculus I',
  credits: 4,
  departmentId: MATH,
  attributes: ['GenEd-Math'],
};

const page = (items, { total = items.length, page: p = 1, limit = 20 } = {}) => ({ items, total, page: p, limit });

const SPRING27 = { _id: 't27', name: 'Spring 2027' };
const SPRING26 = { _id: 't26', name: 'Spring 2026' };
const SECTION = {
  _id: 's1',
  crn: '10004',
  sectionNumber: '0001',
  courseId: { _id: 'c4331', code: 'COP4331', title: COP4331.title, credits: 3 },
  termId: { _id: 't27', name: 'Spring 2027' },
  instructorIds: [{ firstName: 'John', lastName: 'Aedo' }],
  meetings: [{ days: ['M', 'W'], startMinute: 630, endMinute: 705, building: 'HEC', room: '101' }],
  modality: 'in-person',
  capacity: 2,
  enrolledCount: 2,
  waitlistCapacity: 5,
  waitlistCount: 1,
  status: 'open',
};

function login() {
  localStorage.setItem('auth', JSON.stringify(SESSION));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getDepartments.mockResolvedValue([CS, MATH]);
  api.getCourses.mockResolvedValue(page([COP4331, MAC2311]));
  api.getCourse.mockImplementation(async (id) => {
    const found = [COP4331, COP3503, COT3100, MAC2311].find((c) => c._id === id);
    if (!found) throw Object.assign(new Error('Course not found with that ID'), { status: 404 });
    return found;
  });
  api.getTerms.mockResolvedValue([SPRING27, SPRING26]);
  api.getAllSections.mockResolvedValue([SECTION]);
});

describe('Course catalog', () => {
  it('lists courses with credits, department and attributes', async () => {
    login();
    renderApp('/catalog');

    expect(screen.getByRole('heading', { name: 'Course Catalog' })).toBeInTheDocument();
    const item = (await screen.findByRole('link', { name: /COP4331/ })).closest('li');
    expect(item).toHaveTextContent('3 credits');
    expect(item).toHaveTextContent('Computer Science');
    expect(within(item).getByText('Writing Intensive')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /MAC2311/ }).closest('li')).toHaveTextContent('4 credits');

    expect(api.getCourses).toHaveBeenCalledWith({ q: '', departmentId: '', page: 1, limit: 20 }, 'fake.jwt.token');
    expect(screen.getByText('Showing 1–2 of 2 courses')).toBeInTheDocument();
  });

  it('highlights the Course Catalog link in the top nav', async () => {
    login();
    renderApp('/catalog');
    await screen.findByRole('link', { name: /COP4331/ });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Course Catalog' })).toHaveClass('active');
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveClass('active');
  });

  it('searches by code or title when the form is submitted', async () => {
    login();
    renderApp('/catalog');
    await screen.findByRole('link', { name: /COP4331/ });

    await userEvent.type(screen.getByLabelText('Search'), 'calc');
    expect(api.getCourses).toHaveBeenCalledTimes(1); // typing alone doesn't search
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(api.getCourses).toHaveBeenLastCalledWith(
      { q: 'calc', departmentId: '', page: 1, limit: 20 },
      'fake.jwt.token'
    );
  });

  it('filters by department as soon as one is picked', async () => {
    login();
    renderApp('/catalog');
    await screen.findByRole('option', { name: 'Mathematics' });

    await userEvent.selectOptions(screen.getByLabelText('Department'), 'd2');

    expect(api.getCourses).toHaveBeenLastCalledWith(
      { q: '', departmentId: 'd2', page: 1, limit: 20 },
      'fake.jwt.token'
    );
  });

  it('pages through results', async () => {
    api.getCourses.mockResolvedValue(page([COP4331, MAC2311], { total: 45 }));
    login();
    renderApp('/catalog');
    await screen.findByText('Showing 1–20 of 45 courses');

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(api.getCourses).toHaveBeenLastCalledWith(
      { q: '', departmentId: '', page: 2, limit: 20 },
      'fake.jwt.token'
    );
  });

  it('says so when nothing matches', async () => {
    api.getCourses.mockResolvedValue(page([]));
    login();
    renderApp('/catalog?q=zzz');

    expect(await screen.findByText('No courses match your search.')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toHaveValue('zzz');
  });

  it('shows an error with a retry button', async () => {
    api.getCourses.mockRejectedValueOnce(Object.assign(new Error('Cannot reach the server.'), { status: 0 }));
    login();
    renderApp('/catalog');

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /COP4331/ })).toBeInTheDocument();
  });

  it('logs out when the token has expired', async () => {
    api.getCourses.mockRejectedValue(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
    login();
    renderApp('/catalog');

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem('auth')).toBeNull();
  });
});

describe('Course detail', () => {
  it('opens from the catalog and shows prerequisites and sections', async () => {
    login();
    renderApp('/catalog');
    await userEvent.click(await screen.findByRole('link', { name: /COP4331/ }));

    expect(
      await screen.findByRole('heading', { name: 'COP4331: Processes for Object-Oriented Software Development' })
    ).toBeInTheDocument();

    const info = screen.getByRole('heading', { name: 'Course Information' }).closest('section');
    expect(info).toHaveTextContent('Team software projects.');
    // "COP3503 (C or better) and COT3100 and Junior standing", with prereq courses linked
    expect(await within(info).findByRole('link', { name: 'COP3503' })).toHaveAttribute('href', '/catalog/c3503');
    expect(within(info).getByRole('link', { name: 'COT3100' })).toBeInTheDocument();
    expect(info).toHaveTextContent('COP3503 (C or better) and COT3100 and Junior standing');

    const sections = screen.getByRole('heading', { name: 'Sections' }).closest('section');
    expect(await within(sections).findByRole('heading', { name: 'Spring 2027' })).toBeInTheDocument();
    expect(within(sections).queryByRole('heading', { name: 'Spring 2026' })).not.toBeInTheDocument();
    const row = within(sections).getByRole('row', { name: /10004/ });
    expect(row).toHaveTextContent('MW 10:30 AM – 11:45 AM');
    expect(row).toHaveTextContent('John Aedo');
    expect(row).toHaveTextContent('0 of 2 open');
    expect(row).toHaveTextContent('Waitlist');

    expect(api.getAllSections).toHaveBeenCalledWith({ courseId: 'c4331' }, 'fake.jwt.token');
    expect(within(sections).getByRole('link', { name: /Search classes for COP4331/ })).toHaveAttribute(
      'href',
      '/classes?course=COP4331'
    );
  });

  it('nests OR groups in parentheses and notes concurrent prereqs', async () => {
    api.getCourse.mockImplementation(async (id) =>
      id === 'cX'
        ? {
            _id: 'cX',
            code: 'COT3100',
            title: 'Discrete Structures',
            credits: 3,
            prereqs: {
              op: 'AND',
              items: [
                { courseId: 'c3503' },
                { op: 'OR', items: [{ courseId: 'c2311', minGrade: 'C', concurrentOk: true }, { courseId: 'gone' }] },
              ],
            },
          }
        : [COP3503, MAC2311].find((c) => c._id === id) ??
          Promise.reject(Object.assign(new Error('Course not found'), { status: 404 }))
    );
    login();
    renderApp('/catalog/cX');

    const info = (await screen.findByRole('heading', { name: 'Course Information' })).closest('section');
    await within(info).findByRole('link', { name: 'MAC2311' });
    expect(info).toHaveTextContent(
      'COP3503 and (MAC2311 (C or better; may be taken concurrently) or Unknown course)'
    );
  });

  it('shows a not-found error for a bad course id', async () => {
    login();
    renderApp('/catalog/nope');

    expect(await screen.findByRole('alert')).toHaveTextContent('Course not found with that ID');
    expect(screen.getByRole('link', { name: '← Course Catalog' })).toBeInTheDocument();
  });

  it('says when a course has no sections', async () => {
    api.getAllSections.mockResolvedValue([]);
    login();
    renderApp('/catalog/c2311');

    expect(await screen.findByText('This course has no scheduled sections.')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument(); // no prerequisites
  });
});
