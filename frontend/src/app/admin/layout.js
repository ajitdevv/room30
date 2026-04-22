import AdminShell from './_components/AdminShell';

export const metadata = { title: 'Admin · Room30' };

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
