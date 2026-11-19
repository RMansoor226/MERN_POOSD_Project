import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getTerms: vi.fn().mockResolvedValue([]),
  getPrograms: vi.fn().mockResolvedValue([]),
  listResource: vi.fn(),
  getAllResource: vi.fn(),
  getResource: vi.fn(),
  createResource: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
  listUsers: vi.fn(),
}));

const ADMIN = { ...SESSION, id: 'admin1', firstName: 'Root', lastName: 'Admin', role: 'admin' };
const TOKEN = SESSION.token;

const CS = { _id: 'd1', code: 'CS', name: 'Computer Science' };
const MATH = { _id: 'd2', code: 'MAT', name: 'Mathematics' };
const SPRING27 = {
  _id: 't27',
  name: 'Spring 2027',
  year: 2027,
  season: 'spring',
  startDate: '2027-01-11T00:00:00.000Z',
  endDate: '2027-04-30T00:00:00.000Z',
  registrationOpens: '2026-11-02T00:00:00.000Z',
  registrationCloses: '2027-01-22T00:00:00.000Z',
};
const COP3502 = { _id: 'c3502', code: 'COP3502', title: 'Computer Science I', credits: 3, departmentId: CS };
const COP3503 = { _id: 'c3503', code: 'COP3503', title: 'Computer Science II', credits: 3, departmentId: CS };
const MAC2311 = { _id: 'c2311', code: 'MAC2311', title: 'Calculus I', credits: 4, departmentId: MATH };
const AEDO = { _id: 'i1', firstName: 'John', lastName: 'Aedo', title: 'Associate Professor' };
const USERS = [
  { _id: 'admin1', firstName: 'Root', lastName: 'Admin', login: 'admin1', role: 'admin', declarations: [] },
  { _id: 'u2', firstName: 'Me', lastName: 'Too', login: 'metoo', role: 'student', declarations: [{}, {}] },
];

const ALL = {
  '/departments': [CS, MATH],
  '/terms': [SPRING27],
  '/courses': [COP3502, COP3503, MAC2311],
  '/instructors': [AEDO],
  '/sections': [],
  '/programs': [],
};
const page = (items) => ({ items, total: items.length, page: 1, limit: 25 });

function loginAs(session = ADMIN) {
  localStorage.setItem('auth', JSON.stringify(session));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAllResource.mockImplementation(async (path) => ALL[path] ?? []);
  api.listResource.mockImplementation(async (path) => page(ALL[path] ?? []));
  api.listUsers.mockResolvedValue(USERS);
  api.getResource.mockImplementation(async (path, id) => {
    const found = [...(ALL[path] ?? []), ...USERS].find((d) => d._id === id);
    if (!found) throw Object.assign(new Error('Not found'), { status: 404 });
    return found;
  });
  api.createResource.mockImplementation(async (path, body) => ({ _id: 'new1', ...body }));
  api.updateResource.mockImplementation(async (path, id, body) => ({ _id: id, ...body }));
  api.deleteResource.mockResolvedValue({});
});

describe('Admin access', () => {
  it('keeps students out and hides the Admin link from them', async () => {
    api.getUser.mockResolvedValue({ login: 'ada', role: 'student', declarations: [] });
    loginAs(SESSION);
    renderApp('/admin/departments');

    expect(await screen.findByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Main' })).queryByRole('link', { name: 'Admin' })).toBeNull();
    expect(api.listResource).not.toHaveBeenCalled();
  });

  it('shows admins a dashboard with record counts on their home page', async () => {
    loginAs();
    renderApp('/home');

    expect(screen.getByRole('heading', { name: 'Welcome, Root Admin' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    const tile = (name) => screen.getByRole('link', { name: new RegExp(`^\\S+ ${name} Manage`) });
    await waitFor(() => expect(tile('Departments')).toHaveTextContent('2'));
    expect(tile('Courses')).toHaveTextContent('3');
    expect(tile('Users')).toHaveTextContent('2');
    expect(tile('Courses')).toHaveAttribute('href', '/admin/courses');
    expect(api.listResource).toHaveBeenCalledWith('/courses', { limit: 1 }, TOKEN);
  });

  it('sends unknown admin pages back to the dashboard', async () => {
    loginAs();
    renderApp('/admin/widgets');

    expect(await screen.findByRole('heading', { name: 'Admin' })).toBeInTheDocument();
  });
});

describe('Admin list', () => {
  it('lists records and searches with the backend q parameter', async () => {
    loginAs();
    renderApp('/admin/departments');

    const row = await screen.findByRole('row', { name: /Computer Science/ });
    expect(row).toHaveTextContent('CS');
    expect(within(row).getByRole('link', { name: 'Edit CS — Computer Science' })).toHaveAttribute('href', '/admin/departments/d1');
    expect(api.listResource).toHaveBeenCalledWith('/departments', { q: '', page: 1, limit: 25 }, TOKEN);

    await userEvent.type(screen.getByLabelText('Search'), 'math');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(api.listResource).toHaveBeenLastCalledWith('/departments', { q: 'math', page: 1, limit: 25 }, TOKEN);
  });

  it('filters sections by term using the term list', async () => {
    loginAs();
    renderApp('/admin/sections');
    await screen.findByRole('option', { name: 'Spring 2027' });

    await userEvent.selectOptions(screen.getByLabelText('Term'), 't27');

    expect(api.listResource).toHaveBeenLastCalledWith(
      '/sections',
      { q: '', termId: 't27', status: '', page: 1, limit: 25 },
      TOKEN
    );
  });

  it('deletes after confirmation and shows a success message', async () => {
    loginAs();
    renderApp('/admin/departments');
    const row = await screen.findByRole('row', { name: /Mathematics/ });

    await userEvent.click(within(row).getByRole('button', { name: 'Delete MAT — Mathematics' }));
    expect(api.deleteResource).not.toHaveBeenCalled();
    await userEvent.click(within(row).getByRole('button', { name: 'Yes, delete' }));

    expect(api.deleteResource).toHaveBeenCalledWith('/departments', 'd2', TOKEN);
    expect(await screen.findByText('Deleted MAT — Mathematics.')).toBeInTheDocument();
  });

  it('shows why a delete was refused and keeps the row', async () => {
    api.deleteResource.mockRejectedValue(Object.assign(new Error('Term still has sections'), { status: 409 }));
    loginAs();
    renderApp('/admin/terms');
    const row = await screen.findByRole('row', { name: /Spring 2027/ });

    await userEvent.click(within(row).getByRole('button', { name: 'Delete Spring 2027' }));
    await userEvent.click(within(row).getByRole('button', { name: 'Yes, delete' }));

    expect(await within(row).findByRole('alert')).toHaveTextContent('Term still has sections');
    expect(screen.getByRole('row', { name: /Spring 2027/ })).toBeInTheDocument();
  });

  it('manages users locally: search, no New button, cannot delete yourself', async () => {
    loginAs();
    renderApp('/admin/users');

    const self = await screen.findByRole('row', { name: /admin1/ });
    expect(self).toHaveTextContent("That's you");
    expect(within(self).queryByRole('button', { name: /Delete/ })).toBeNull();
    expect(screen.getByRole('row', { name: /metoo/ })).toHaveTextContent('2'); // declared programs
    expect(screen.queryByRole('link', { name: 'New user' })).toBeNull();

    await userEvent.type(screen.getByLabelText('Search'), 'too');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.queryByRole('row', { name: /admin1/ })).toBeNull());
    expect(screen.getByRole('row', { name: /metoo/ })).toBeInTheDocument();
  });
});

describe('Admin form', () => {
  it('creates a department and returns to the list with a message', async () => {
    loginAs();
    renderApp('/admin/departments');
    await userEvent.click(await screen.findByRole('link', { name: 'New department' }));

    await userEvent.type(screen.getByLabelText(/^Code/), 'PHY');
    await userEvent.type(screen.getByLabelText(/^Name/), ' Physics ');
    await userEvent.click(screen.getByRole('button', { name: 'Create department' }));

    expect(api.createResource).toHaveBeenCalledWith('/departments', { code: 'PHY', name: 'Physics' }, TOKEN);
    expect(await screen.findByText('Created PHY — Physics.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Departments' })).toBeInTheDocument();
  });

  it('checks required fields before calling the API', async () => {
    loginAs();
    renderApp('/admin/departments/new');

    await userEvent.click(await screen.findByRole('button', { name: 'Create department' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.');
    expect(screen.getByText('Code is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Code/)).toHaveAttribute('aria-invalid', 'true');
    expect(api.createResource).not.toHaveBeenCalled();
  });

  it('shows backend validation details next to the right field', async () => {
    api.createResource.mockRejectedValue(
      Object.assign(new Error('Validation Failed'), { status: 400, details: { endDate: 'endDate must be after startDate' } })
    );
    loginAs();
    renderApp('/admin/terms/new');
    await screen.findByLabelText(/^Name/);

    await userEvent.type(screen.getByLabelText(/^Name/), 'Fall 2027');
    await userEvent.type(screen.getByLabelText(/^Year/), '2027');
    await userEvent.selectOptions(screen.getByLabelText(/^Season/), 'fall');
    for (const [label, value] of [
      ['Classes start', '2027-08-23'],
      ['Classes end', '2027-08-01'],
      ['Registration opens', '2027-04-01'],
      ['Registration closes', '2027-08-30'],
    ]) {
      fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });
    }
    await userEvent.click(screen.getByRole('button', { name: 'Create term' }));

    expect(api.createResource).toHaveBeenCalledWith(
      '/terms',
      {
        name: 'Fall 2027',
        year: 2027,
        season: 'fall',
        startDate: '2027-08-23',
        endDate: '2027-08-01',
        registrationOpens: '2027-04-01',
        registrationCloses: '2027-08-30',
      },
      TOKEN
    );
    expect(await screen.findByText('endDate must be after startDate')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Classes end/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Validation Failed');
  });

  it('edits a term with its saved values filled in', async () => {
    loginAs();
    renderApp('/admin/terms/t27');

    expect(await screen.findByRole('heading', { name: 'Edit Spring 2027' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Classes start/)).toHaveValue('2027-01-11');
    expect(screen.getByLabelText(/^Year/)).toHaveValue(2027);

    await userEvent.clear(screen.getByLabelText(/^Name/));
    await userEvent.type(screen.getByLabelText(/^Name/), 'Spring 2027 (revised)');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(api.updateResource).toHaveBeenCalledWith(
      '/terms',
      't27',
      expect.objectContaining({ name: 'Spring 2027 (revised)', year: 2027, startDate: '2027-01-11' }),
      TOKEN
    );
    expect(await screen.findByText('Saved Spring 2027 (revised).')).toBeInTheDocument();
  });

  it('creates a section with instructors and meeting times converted to minutes', async () => {
    loginAs();
    renderApp('/admin/sections/new');
    await screen.findByRole('option', { name: 'COP3502 — Computer Science I' });

    await userEvent.selectOptions(screen.getByLabelText(/^Course/), 'c3502');
    await userEvent.selectOptions(screen.getByLabelText(/^Term/), 't27');
    await userEvent.type(screen.getByLabelText(/^Section number/), '0002');
    await userEvent.type(screen.getByLabelText(/^CRN/), '10099');
    await userEvent.selectOptions(screen.getByLabelText('Instructors'), 'i1');
    expect(screen.getByRole('list', { name: 'Selected instructors' })).toHaveTextContent('Aedo, John');
    await userEvent.type(screen.getByLabelText(/^Capacity/), '30');

    await userEvent.click(screen.getByRole('button', { name: 'Add meeting time' }));
    const meeting = screen.getByRole('group', { name: 'Meeting 1' });
    await userEvent.click(within(meeting).getByLabelText('Tue'));
    await userEvent.click(within(meeting).getByLabelText('Thu'));
    fireEvent.change(within(meeting).getByLabelText('Starts'), { target: { value: '13:30' } });
    fireEvent.change(within(meeting).getByLabelText('Ends'), { target: { value: '14:45' } });
    await userEvent.type(within(meeting).getByLabelText('Building'), 'HEC');
    await userEvent.type(within(meeting).getByLabelText('Room'), '103');

    await userEvent.click(screen.getByRole('button', { name: 'Create section' }));

    expect(api.createResource).toHaveBeenCalledWith(
      '/sections',
      {
        courseId: 'c3502',
        termId: 't27',
        sectionNumber: '0002',
        crn: '10099',
        instructorIds: ['i1'],
        meetings: [{ days: ['T', 'R'], startMinute: 810, endMinute: 885, building: 'HEC', room: '103' }],
        modality: 'in-person',
        status: 'open',
        capacity: 30,
        waitlistCapacity: 0,
      },
      TOKEN
    );
  });

  it('catches a meeting that ends before it starts', async () => {
    loginAs();
    renderApp('/admin/sections/new');
    await screen.findByRole('option', { name: 'COP3502 — Computer Science I' });

    await userEvent.click(screen.getByRole('button', { name: 'Add meeting time' }));
    const meeting = screen.getByRole('group', { name: 'Meeting 1' });
    await userEvent.click(within(meeting).getByLabelText('Mon'));
    fireEvent.change(within(meeting).getByLabelText('Starts'), { target: { value: '10:00' } });
    fireEvent.change(within(meeting).getByLabelText('Ends'), { target: { value: '09:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create section' }));

    expect(screen.getByText('Meeting 1: end time must be after start time.')).toBeInTheDocument();
    expect(api.createResource).not.toHaveBeenCalled();
  });

  it('locks course and term when editing a section and leaves them out of the update', async () => {
    ALL['/sections'] = [
      {
        _id: 's1',
        crn: '10004',
        sectionNumber: '0001',
        courseId: { _id: 'c3502', code: 'COP3502' },
        termId: { _id: 't27', name: 'Spring 2027' },
        instructorIds: [{ _id: 'i1', firstName: 'John', lastName: 'Aedo' }],
        meetings: [{ days: ['M', 'W'], startMinute: 630, endMinute: 705, building: 'HEC', room: '101' }],
        modality: 'in-person',
        capacity: 2,
        waitlistCapacity: 5,
        status: 'open',
      },
    ];
    loginAs();
    renderApp('/admin/sections/s1');

    expect(await screen.findByLabelText(/^Course/)).toBeDisabled();
    expect(screen.getByLabelText(/^Course/)).toHaveValue('c3502');
    expect(screen.getByLabelText(/^Term/)).toBeDisabled();
    expect(within(screen.getByRole('group', { name: 'Meeting 1' })).getByLabelText('Starts')).toHaveValue('10:30');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const body = api.updateResource.mock.calls[0][2];
    expect(body).not.toHaveProperty('courseId');
    expect(body).not.toHaveProperty('termId');
    expect(body.instructorIds).toEqual(['i1']);
    expect(body.meetings).toEqual([{ days: ['M', 'W'], startMinute: 630, endMinute: 705, building: 'HEC', room: '101' }]);
    ALL['/sections'] = [];
  });

  it('builds a nested prerequisite tree for a course', async () => {
    loginAs();
    renderApp('/admin/courses/new');
    await screen.findByRole('option', { name: 'CS — Computer Science' });

    await userEvent.type(screen.getByLabelText(/^Subject/), 'COT');
    await userEvent.type(screen.getByLabelText(/^Number/), '3100');
    await userEvent.type(screen.getByLabelText(/^Title/), 'Discrete Structures');
    await userEvent.type(screen.getByLabelText(/^Credits/), '3');
    await userEvent.type(screen.getByLabelText(/^Attributes/), 'Core,  Math ,');

    await userEvent.click(screen.getByRole('button', { name: 'Add prerequisites' }));
    await userEvent.selectOptions(screen.getByLabelText('Course', { selector: '#prereq-0-course' }), 'c3503');
    await userEvent.selectOptions(screen.getByLabelText('Min grade', { selector: '#prereq-0-grade' }), 'C');
    // add an OR group: (MAC2311 concurrently OR COP3502)
    await userEvent.click(screen.getByRole('button', { name: 'Add group' }));
    await userEvent.selectOptions(screen.getByLabelText('Course', { selector: '#prereq-1-0-course' }), 'c2311');
    await userEvent.click(screen.getAllByLabelText('Can take at the same time')[1]);
    // the inner group's button comes first in the page
    await userEvent.click(screen.getAllByRole('button', { name: 'Add course' })[0]);
    await userEvent.selectOptions(screen.getByLabelText('Course', { selector: '#prereq-1-1-course' }), 'c3502');

    await userEvent.click(screen.getByRole('button', { name: 'Create course' }));

    const body = api.createResource.mock.calls[0][1];
    expect(body.attributes).toEqual(['Core', 'Math']);
    expect(body.prereqs).toEqual({
      op: 'AND',
      items: [
        { courseId: 'c3503', minGrade: 'C' },
        { op: 'OR', items: [{ courseId: 'c2311', concurrentOk: true }, { courseId: 'c3502' }] },
      ],
    });
    expect(body.coreqs).toEqual([]);
  });

  it('does not offer a course as its own prerequisite or corequisite', async () => {
    ALL['/courses'] = [COP3502, COP3503, MAC2311];
    loginAs();
    renderApp('/admin/courses/c3503');
    await screen.findByRole('heading', { name: 'Edit COP3503 — Computer Science II' });

    const coreqs = screen.getByLabelText('Corequisites');
    expect(within(coreqs).queryByRole('option', { name: /COP3503/ })).toBeNull();
    expect(within(coreqs).getByRole('option', { name: /COP3502/ })).toBeInTheDocument();
  });

  it('edits program requirements with rules and filters', async () => {
    loginAs();
    renderApp('/admin/programs/new');
    await screen.findByRole('option', { name: 'CS — Computer Science' });

    await userEvent.type(screen.getByLabelText(/^Name/), 'Data Science');
    await userEvent.selectOptions(screen.getByLabelText(/^Type/), 'minor');
    await userEvent.type(screen.getByLabelText(/^Catalog year/), '2026');

    await userEvent.click(screen.getByRole('button', { name: 'Add requirement' }));
    await userEvent.type(screen.getByLabelText('Name', { selector: '#req0-name' }), 'Electives');
    await userEvent.selectOptions(screen.getByLabelText('Rule'), 'anyN');
    await userEvent.type(screen.getByLabelText('How many courses'), '2');
    await userEvent.selectOptions(screen.getByLabelText('Courses'), 'c2311');
    await userEvent.type(screen.getByLabelText('Subject', { selector: '#req0-subject' }), 'cop');
    await userEvent.type(screen.getByLabelText('Minimum level'), '4000');

    await userEvent.click(screen.getByRole('button', { name: 'Create program' }));

    expect(api.createResource).toHaveBeenCalledWith(
      '/programs',
      {
        name: 'Data Science',
        type: 'minor',
        degree: '',
        catalogYear: 2026,
        requirements: [
          { name: 'Electives', rule: 'anyN', n: 2, courseIds: ['c2311'], filter: { subject: 'COP', minLevel: 4000 } },
        ],
      },
      TOKEN
    );
  });

  it('requires a requirement to have a name and courses or a filter', async () => {
    loginAs();
    renderApp('/admin/programs/new');
    await screen.findByRole('option', { name: 'CS — Computer Science' });
    await userEvent.type(screen.getByLabelText(/^Name/), 'X');
    await userEvent.selectOptions(screen.getByLabelText(/^Type/), 'major');
    await userEvent.type(screen.getByLabelText(/^Catalog year/), '2026');
    await userEvent.click(screen.getByRole('button', { name: 'Add requirement' }));
    await userEvent.type(screen.getByLabelText('Name', { selector: '#req0-name' }), 'Core');

    await userEvent.click(screen.getByRole('button', { name: 'Create program' }));

    expect(screen.getByText('Core: pick courses or set a filter.')).toBeInTheDocument();
    expect(api.createResource).not.toHaveBeenCalled();
  });

  it("edits a user's name and email but not their login or role", async () => {
    loginAs();
    renderApp('/admin/users/u2');

    expect(await screen.findByRole('heading', { name: 'Edit Me Too' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Role/)).toBeNull();
    await userEvent.type(screen.getByLabelText(/^Email/), 'me@example.edu');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(api.updateResource).toHaveBeenCalledWith(
      '/users',
      'u2',
      { firstName: 'Me', lastName: 'Too', email: 'me@example.edu' },
      TOKEN
    );
  });

  it('links an instructor to an instructor-role login', async () => {
    api.listUsers.mockResolvedValue([
      ...USERS,
      { _id: 'u3', firstName: 'John', lastName: 'Aedo', login: 'jaedo', role: 'instructor', declarations: [] },
    ]);
    loginAs();
    renderApp('/admin/instructors/i1');

    const select = await screen.findByLabelText(/^Login account/);
    // only instructor-role users are offered
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['None', 'John Aedo']);
    await userEvent.selectOptions(select, 'u3');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(api.updateResource).toHaveBeenCalledWith('/instructors', 'i1', expect.objectContaining({ userId: 'u3' }), TOKEN);
  });

  it('cannot open a create form for users', async () => {
    loginAs();
    renderApp('/admin/users/new');

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
  });
});
