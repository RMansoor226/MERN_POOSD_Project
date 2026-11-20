import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getTerms: vi.fn(),
  getPrograms: vi.fn().mockResolvedValue([]),
  getAllResource: vi.fn(),
  getAllSections: vi.fn(),
}));

const TOKEN = SESSION.token;
const SPRING27 = { _id: 't27', name: 'Spring 2027' };
const SPRING26 = { _id: 't26', name: 'Spring 2026' };
const AEDO = { _id: 'i1', userId: 'abc123', firstName: 'John', lastName: 'Aedo', title: 'Associate Professor' };
const OTHER = { _id: 'i2', userId: 'someone-else', firstName: 'Priya', lastName: 'Raman' };

const section = (id, crn, termId, termName, code) => ({
  _id: id,
  crn,
  sectionNumber: '0001',
  courseId: { _id: `c-${code}`, code, title: `${code} title` },
  termId: { _id: termId, name: termName },
  instructorIds: [{ firstName: 'John', lastName: 'Aedo' }],
  meetings: [],
  modality: 'in-person',
  capacity: 40,
  enrolledCount: 10,
  status: 'open',
});

function renderAs(role) {
  localStorage.setItem('auth', JSON.stringify({ ...SESSION, role }));
  renderApp('/home');
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getUser.mockImplementation(async () => ({
    _id: 'abc123',
    firstName: 'Ada',
    lastName: 'Lovelace',
    login: 'ada',
    role: JSON.parse(localStorage.getItem('auth')).role,
    declarations: [],
  }));
  api.getTerms.mockResolvedValue([SPRING27, SPRING26]);
  api.getAllResource.mockResolvedValue([OTHER, AEDO]);
  api.getAllSections.mockResolvedValue([
    section('s1', '10004', 't27', 'Spring 2027', 'COP4331'),
    section('s2', '10002', 't26', 'Spring 2026', 'COP3502'),
  ]);
});

describe('Instructor home', () => {
  it('shows the sections the linked instructor teaches, newest term first, and their profile', async () => {
    renderAs('instructor');

    expect(screen.getByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument();
    const card = (await screen.findByRole('heading', { name: 'My Teaching' })).closest('section');
    const terms = await within(card).findAllByRole('heading', { level: 3 });
    expect(terms.map((h) => h.textContent)).toEqual(['Spring 2027', 'Spring 2026']);
    expect(within(card).getByRole('row', { name: /10004/ })).toHaveTextContent('COP4331');
    expect(card).toHaveTextContent('Associate Professor');

    expect(api.getAllSections).toHaveBeenCalledWith({ instructorId: 'i1' }, TOKEN);
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Class Rosters' })).toBeInTheDocument();
  });

  it('explains how to get linked when no instructor record points at this login', async () => {
    api.getAllResource.mockResolvedValue([OTHER]);
    renderAs('instructor');

    expect(await screen.findByText(/isn.t linked to an instructor profile yet/)).toBeInTheDocument();
    expect(api.getAllSections).not.toHaveBeenCalled();
  });

  it('says so when the instructor has no sections', async () => {
    api.getAllSections.mockResolvedValue([]);
    renderAs('instructor');

    expect(await screen.findByText('You are not assigned to any sections yet.')).toBeInTheDocument();
  });
});

describe('Advisor home', () => {
  it('shows the profile and honest placeholders, with no teaching lookup', async () => {
    renderAs('advisor');

    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Advisees' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Degree Audits' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My Teaching' })).toBeNull();
    const browse = screen.getByRole('heading', { name: 'Browse' }).closest('section');
    expect(within(browse).getByRole('link', { name: 'Course Catalog' })).toHaveAttribute('href', '/catalog');
    expect(api.getAllResource).not.toHaveBeenCalled();
  });
});
