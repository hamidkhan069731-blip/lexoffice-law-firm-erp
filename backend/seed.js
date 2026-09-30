// seed.js — same sample dataset the original front-end generated in the
// browser on first run, now generated on the server at boot time instead.
// It has to live server-side because seeding used to happen *before*
// login (there was no login), but now every /api/* call requires a JWT.
// Running it once at server startup means the app still opens with a
// ready-made demo dataset the very first time, with zero client changes.

const store = require('./db');

function uid(prefix) {
  return (prefix || 'ID') + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);
}
function nowIso() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function recentDate(daysAgo) { return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10); }
function futureDate(daysAhead) { return new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10); }

const OPT = {
  caseType: ['Civil', 'Criminal', 'Family', 'Property', 'Corporate', 'Banking', 'Tax', 'Labour', 'Constitutional', 'Service', 'Rent', 'Other'],
  hearingType: ['Arguments', 'Evidence', 'Cross Examination', 'Summons', 'Bail', 'Notice', 'Order', 'Judgment', 'Adjournment', 'Other'],
  docCategory: ['CNIC', 'Petition', 'Application', 'FIR', 'Evidence', 'Court Order', 'Judgment', 'Agreement', 'Affidavit', 'Notice', 'Other'],
  dateType: ['Hearing', 'Limitation Date', 'Filing Deadline', 'Document Deadline', 'Payment Due Date', 'Meeting', 'Follow-up', 'Other'],
  feeType: ['Consultation', 'Case Fee', 'Appearance Fee', 'Drafting Fee', 'Filing Fee', 'Professional Fee', 'Other'],
  paymentMethod: ['Cash', 'Bank', 'Online Transfer', 'Cheque', 'Other'],
  expenseCategory: ['Court Fee', 'Filing', 'Travel', 'Photocopy', 'Courier', 'Documentation', 'Office Expense', 'Staff Expense', 'Other']
};

function seedDemoData() {
  const existing = store.all('clients');
  if (existing.length) return; // don't reseed if data already exists

  const firstNames = ['Ahmed', 'Bilal', 'Fatima', 'Ayesha', 'Usman', 'Hassan', 'Sara', 'Zainab', 'Imran', 'Nadia', 'Faisal', 'Mehwish'];
  const lastNames = ['Khan', 'Malik', 'Sheikh', 'Chaudhry', 'Butt', 'Raza', 'Iqbal', 'Farooq'];
  const cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan'];

  const clients = [];
  for (let i = 0; i < 10; i++) {
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const cl = {
      id: uid('CL'), clientId: uid('CL'), fullName: name, guardianName: `S/O ${lastNames[(i + 2) % lastNames.length]}`,
      cnic: `35202-${1000000 + i * 37}-${i % 9 + 1}`, phone: `0300-${1000000 + i * 111}`, whatsapp: `0300-${1000000 + i * 111}`,
      email: `${name.split(' ')[0].toLowerCase()}${i}@example.com`,
      address: `House ${i + 12}, Street ${i + 3}, ${cities[i % cities.length]}`, city: cities[i % cities.length],
      occupation: i % 3 === 0 ? 'Businessman' : (i % 3 === 1 ? 'Government Employee' : 'Private Employee'),
      clientType: i % 5 === 0 ? 'Company' : 'Individual', status: i === 9 ? 'Inactive' : 'Active',
      registrationDate: recentDate(200 - i * 8), notes: 'Sample/demo client for evaluation purposes.', createdAt: nowIso()
    };
    clients.push(cl); store.put('clients', cl);
  }

  const courts = [
    { id: uid('CRT'), courtName: 'Lahore High Court', courtType: 'High Court', city: 'Lahore', district: 'Lahore', judge: 'Justice M. Tariq', courtNumber: 'Court No. 4', address: 'Fane Road, Lahore', notes: '', createdAt: nowIso() },
    { id: uid('CRT'), courtName: 'District Court Lahore', courtType: 'District Court', city: 'Lahore', district: 'Lahore', judge: 'Judge S. Ahmed', courtNumber: 'Court No. 12', address: 'Multan Road, Lahore', notes: '', createdAt: nowIso() },
    { id: uid('CRT'), courtName: 'Sessions Court Karachi', courtType: 'Sessions Court', city: 'Karachi', district: 'Karachi Central', judge: 'Judge R. Baig', courtNumber: 'Court No. 7', address: 'I.I. Chundrigar Road', notes: '', createdAt: nowIso() },
    { id: uid('CRT'), courtName: 'Family Court Islamabad', courtType: 'Family Court', city: 'Islamabad', district: 'Islamabad', judge: 'Judge N. Chaudhry', courtNumber: 'Court No. 2', address: 'G-11, Islamabad', notes: '', createdAt: nowIso() },
    { id: uid('CRT'), courtName: 'Banking Court Lahore', courtType: 'Banking Court', city: 'Lahore', district: 'Lahore', judge: 'Judge A. Siddiqui', courtNumber: 'Court No. 1', address: 'Egerton Road, Lahore', notes: '', createdAt: nowIso() }
  ];
  for (const c of courts) store.put('courts', c);

  const caseTypes = OPT.caseType, statuses = ['Active', 'Pending', 'Under Trial', 'New', 'Won', 'Lost', 'Closed', 'Decision Pending'];
  const lawyers = ['Barrister Ahmed Raza', 'Advocate Bilal Assistant'];
  const cases = [];
  for (let i = 0; i < 15; i++) {
    const client = clients[i % clients.length];
    const court = courts[i % courts.length];
    const cs = {
      id: uid('CASE'), caseNumber: `CN-2026-${String(100 + i)}`, caseTitle: `${client.fullName} vs. ${lastNames[(i + 1) % lastNames.length]} ${firstNames[(i + 4) % firstNames.length]}`,
      clientId: client.id, caseType: caseTypes[i % caseTypes.length], court: court.courtName, courtLocation: court.city, judge: court.judge,
      opposingParty: `${firstNames[(i + 5) % firstNames.length]} ${lastNames[(i + 6) % lastNames.length]}`, opposingLawyer: `Advocate ${lastNames[(i + 2) % lastNames.length]}`,
      filingDate: recentDate(180 - i * 6), registrationDate: recentDate(178 - i * 6), nextHearingDate: futureDate((i % 10) - 2),
      status: statuses[i % statuses.length], priority: ['Low', 'Normal', 'High', 'Urgent'][i % 4], lawyerAssigned: lawyers[i % 2],
      description: 'Sample case created for demonstration purposes covering typical civil/criminal litigation workflow.', remarks: '', createdAt: nowIso()
    };
    cases.push(cs); store.put('cases', cs);
  }

  for (let i = 0; i < 28; i++) {
    const cs = cases[i % cases.length];
    const hd = i < 10 ? futureDate(i - 3) : recentDate(i * 5);
    store.put('hearings', {
      id: uid('HRG'), caseId: cs.id, hearingDate: hd, hearingTime: ['09:30', '10:00', '11:15', '14:00'][i % 4], court: cs.court, judge: cs.judge,
      hearingType: OPT.hearingType[i % OPT.hearingType.length], purpose: 'Routine hearing', status: hd < todayStr() ? 'Completed' : 'Scheduled',
      result: hd < todayStr() ? 'Arguments heard, adjourned to next date.' : '', nextDate: hd < todayStr() ? futureDate(i % 14) : '', notes: '', createdAt: nowIso()
    });
  }

  const taskTitles = ['Prepare written statement', 'File rejoinder', 'Collect evidence documents', 'Draft appeal', 'Client follow-up call', 'Prepare cross-examination questions', 'Submit court fee challan', 'Review case file'];
  for (let i = 0; i < 12; i++) {
    const cs = cases[i % cases.length];
    store.put('tasks', {
      id: uid('TSK'), title: taskTitles[i % taskTitles.length], caseId: cs.id, clientId: cs.clientId, assignedTo: lawyers[i % 2],
      dueDate: i % 4 === 0 ? recentDate(3 + i) : futureDate(i), priority: ['Low', 'Normal', 'High', 'Urgent'][i % 4], status: ['Pending', 'In Progress', 'Completed'][i % 3], notes: '', createdAt: nowIso()
    });
  }

  for (let i = 0; i < 6; i++) {
    store.put('importantDates', { id: uid('DT'), title: `${OPT.dateType[i % OPT.dateType.length]} — ${cases[i].caseNumber}`, type: OPT.dateType[i % OPT.dateType.length], date: futureDate(i * 3 + 1), caseId: cases[i].id, notes: '', createdAt: nowIso() });
  }

  for (let i = 0; i < 15; i++) {
    const cs = cases[i]; const amt = 20000 + (i % 6) * 15000;
    const recvd = i % 3 === 0 ? amt : (i % 3 === 1 ? Math.round(amt * 0.5) : 0);
    store.put('fees', {
      id: uid('FEE'), clientId: cs.clientId, caseId: cs.id, feeType: OPT.feeType[i % OPT.feeType.length], amount: amt, receivedAmount: recvd,
      dueDate: futureDate(i), paymentStatus: recvd >= amt ? 'Paid' : (recvd > 0 ? 'Partial' : 'Unpaid'), notes: '', createdAt: nowIso()
    });
    if (recvd > 0) {
      store.put('payments', { id: uid('PAY'), clientId: cs.clientId, caseId: cs.id, date: recentDate(i * 4), amount: recvd, method: OPT.paymentMethod[i % OPT.paymentMethod.length], reference: `RCPT-${1000 + i}`, receivedBy: lawyers[i % 2], notes: '', createdAt: nowIso() });
    }
  }

  for (let i = 0; i < 14; i++) {
    const cs = cases[i % cases.length];
    store.put('expenses', { id: uid('EXP'), date: recentDate(i * 5), category: OPT.expenseCategory[i % OPT.expenseCategory.length], amount: 500 + (i % 8) * 350, caseId: cs.id, clientId: cs.clientId, paidBy: lawyers[i % 2], description: 'Sample expense entry.', createdAt: nowIso() });
  }

  const docCats = OPT.docCategory;
  for (let i = 0; i < 10; i++) {
    const cs = cases[i % cases.length];
    store.put('documents', { id: uid('DOC'), title: `${docCats[i % docCats.length]} — ${cs.caseNumber}`, category: docCats[i % docCats.length], caseId: cs.id, clientId: cs.clientId, filePath: `/case-files/${cs.caseNumber}/doc-${i + 1}.pdf`, uploadDate: recentDate(i * 7), notes: '', createdAt: nowIso() });
  }

  for (let i = 0; i < 8; i++) {
    const cs = cases[i];
    store.put('caseParties', { id: uid('OP'), caseId: cs.id, name: cs.opposingParty, guardianName: '', cnic: '', phone: '', lawyer: cs.opposingLawyer, address: '', notes: '', createdAt: nowIso() });
  }

  store.put('auditLogs', { id: uid('LOG'), date: nowIso(), user: 'System', action: 'Demo Data Seeded', entity: 'System', detail: 'Sample dataset generated on first run' });
  console.log('[lexoffice] seeded demo dataset (10 clients, 15 cases, hearings, fees, tasks, documents...)');
}

module.exports = { seedDemoData };
