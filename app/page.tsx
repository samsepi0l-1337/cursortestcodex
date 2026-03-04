export default function HomePage() {
  return (
    <section className="card">
      <h1>User Management Module</h1>
      <p>
        This app includes Auth.js v5 authentication, profile CRUD with avatar
        upload, and admin-only dashboard routes.
      </p>
      <ul>
        <li>Sign in via credentials (backed by Prisma users)</li>
        <li>Read, create, update, and delete your profile</li>
        <li>Upload a profile image to S3-compatible storage</li>
        <li>Access admin pages only with admin role</li>
      </ul>
    </section>
  );
}
