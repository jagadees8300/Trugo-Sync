import * as XLSX from 'xlsx';
import { ROLE_LABELS, type AppRole, type User } from '../types';

const resolveRole = (user: User): string => {
  if (typeof user.role === 'string') return user.role;
  if (user.role && typeof user.role === 'object' && 'name' in user.role) {
    return String(user.role.name);
  }
  return 'EMPLOYEE';
};

/** Download team members as an Excel (.xlsx) file. */
export function downloadTeamMembersExcel(members: User[], filename = 'team-members.xlsx') {
  const rows = members.map((m, index) => {
    const role = resolveRole(m) as AppRole;
    return {
      '#': index + 1,
      Name: m.name || '',
      Email: m.email || '',
      Role: ROLE_LABELS[role] ?? role,
      Designation: m.designation || '',
      'User ID': m._id || m.id || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(
    rows.length
      ? rows
      : [{ '#': '', Name: '', Email: '', Role: '', Designation: '', 'User ID': '' }],
  );
  worksheet['!cols'] = [
    { wch: 4 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 28 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Members');
  XLSX.writeFile(workbook, filename);
}
