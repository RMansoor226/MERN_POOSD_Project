import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getPrograms: vi.fn(),
  getTerms: vi.fn(),
  getCourses: vi.fn(),
  getSections: vi.fn(),
}));

// Dates relative to "now" so the default-term logic is stable whenever the tests run
const DAY = 24 * 60 * 60 * 1000;
const iso = (days) => new Date(Date.now() + days * DAY).toISOString();

const PAST = {
  _id: 'tPast',
  name: 'Spring 2026',
  startDate: iso(-300),
  endDate: iso(-200),
  registrationOpens: iso(-400),
  registrationCloses: iso(-290),
};
const REGISTERING = {
  _id: 'tNext',
  name: 'Spring 2027',
  startDate: iso(55),
  endDate: iso(165),
  registrationOpens: iso(-15),
  registrationCloses: iso(66),
};

const FULL = {
  _id: 's1',
  crn: '10004',
  sectionNumber: '0001',
  courseId: { _id: 'c4331', code: 'COP4331', title: 'Processes for Object-Oriented Software Development', credits: 3 },
  termId: { _id: 'tNext', name: 'Spring 2027' },
  instructorIds: [{ firstName: 'John', lastName: 'Aedo' }],
  meetings: [{ days: ['M', 'W'], startMinute: 630, endMinute: 705, building: 'HEC', room: '101' }],
  modality: 'in-person',
  capacity: 2,
  enrolledCount: 2,
  waitlistCapacity: 5,
  waitlistCount: 1,
  status: 'open',
};
const OPEN = {
  ...FULL,
  _id: 's2',
  crn: '10005',
  sectionNumber: '0002',
  instructorIds: [],
  meetings: [],
  modality: 'online',
  capacity: 40,
  enrolledCount: 0,
  waitlistCount: 0,
};

const page = (items, total = items.length) => ({ items, total, page: 1, limit: 25 });
const TOKEN = 'fake.jwt.token';

function login() {
  localStorage.setItem('auth', JSON.stringify(SESSION));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getTerms.mockResolvedValue([REGISTERING, PAST]);
  api.getSections.mockResolvedValue(page([FULL, OPEN]));
  api.getCourses.mockResolvedValue({ items: [FULL.courseId], total: 1, page: 1, limit: 100 });
});

describe('Class search', () => {
  it('defaults to the term with open registration and lists its sections', async () => {
    login();
    renderApp('/classes');

    expect(await screen.findByLabelText('Term')).toHaveValue('tNext');
    await waitFor(() =>
      expect(api.getSections).toHaveBeenCalledWith(
        { termId: 'tNext', courseId: undefined, status: '', modality: '', page: 1, limit: 25 },
        TOKEN
      )
    );

    const full = await screen.findByRole('row', { name: /10004/ });
    expect(within(full).getByRole('link', { name: 'COP4331' })).toHaveAttribute('href', '/catalog/c4331');
    expect(full).toHaveTextContent('MW 10:30 AM – 11:45 AM');
    expect(full).toHaveTextContent('HEC 101');
    expect(full).toHaveTextContent('John Aedo');
    expect(full).toHaveTextContent('In person');
    expect(full).toHaveTextContent('0 of 2 open');
    expect(full).toHaveTextContent('Waitlist 1/5');

    const open = screen.getByRole('row', { name: /10005/ });
    expect(open).toHaveTextContent('TBA');
    expect(open).toHaveTextContent('Staff');
    expect(open).toHaveTextContent('Online');
    expect(open).toHaveTextContent('40 of 40 open');
    expect(within(open).getByText('Open')).toHaveClass('status-open');

    expect(screen.getByText(/Spring 2027 runs/)).toHaveTextContent('Registration');
  });

  it('switches terms', async () => {
    login();
    renderApp('/classes');
    await screen.findByRole('row', { name: /10004/ });

    await userEvent.selectOptions(screen.getByLabelText('Term'), 'tPast');

    expect(api.getSections).toHaveBeenLastCalledWith(expect.objectContaining({ termId: 'tPast', page: 1 }), TOKEN);
  });

  it('looks up a typed course code and searches its sections', async () => {
    login();
    renderApp('/classes');
    await screen.findByRole('row', { name: /10004/ });

    await userEvent.type(screen.getByLabelText('Course'), 'cop 4331');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(api.getCourses).toHaveBeenCalledWith({ q: 'COP4331', limit: 100 }, TOKEN);
    expect(api.getSections).toHaveBeenLastCalledWith(
      expect.objectContaining({ termId: 'tNext', courseId: 'c4331' }),
      TOKEN
    );
  });

  it('prefills the course from the URL (link from a course page)', async () => {
    login();
    renderApp('/classes?course=COP4331');

    expect(await screen.findByLabelText('Course')).toHaveValue('COP4331');
    await screen.findByRole('row', { name: /10004/ });
    expect(api.getSections).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'c4331' }), TOKEN);
  });

  it('asks for one course when the text matches several', async () => {
    api.getCourses.mockResolvedValue({
      items: [
        { _id: 'a', code: 'COP3502' },
        { _id: 'b', code: 'COP3503' },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    login();
    renderApp('/classes?course=COP');

    expect(await screen.findByText(/matches several courses: COP3502, COP3503/)).toBeInTheDocument();
    expect(api.getSections).not.toHaveBeenCalled();
  });

  it('says when no course matches', async () => {
    api.getCourses.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    login();
    renderApp('/classes?course=XYZ9999');

    expect(await screen.findByText('No course matches “XYZ9999”.')).toBeInTheDocument();
  });

  it('filters by status and mode', async () => {
    login();
    renderApp('/classes');
    await screen.findByRole('row', { name: /10004/ });

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'open');
    await userEvent.selectOptions(screen.getByLabelText('Mode'), 'online');

    expect(api.getSections).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'open', modality: 'online', page: 1 }),
      TOKEN
    );
  });

  it('says when no sections match', async () => {
    api.getSections.mockResolvedValue(page([]));
    login();
    renderApp('/classes');

    expect(await screen.findByText('No sections match these filters.')).toBeInTheDocument();
  });

  it('handles a school with no terms yet', async () => {
    api.getTerms.mockResolvedValue([]);
    login();
    renderApp('/classes');

    expect(await screen.findByText('No terms have been scheduled yet.')).toBeInTheDocument();
    expect(api.getSections).not.toHaveBeenCalled();
  });
});
