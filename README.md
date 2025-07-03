# RMS_FE

This is a [Next.js](https://nextjs.org) project, bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

To start the development server, run one of the following commands:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Once running, open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

You can begin development by editing `src/app/page.tsx`. Changes are reflected automatically.

## Project Structure

```
├── src/
│   ├── app/                # Next.js app directory (routing, pages, layouts)
│   ├── components/         # Reusable UI components (admin, auth, dialogs, features, fields, layout, stages, ui)
│   ├── config/             # Configuration files (e.g., RBAC)
│   ├── constants/          # App-wide constants (e.g., permissions)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries (API client, types, helpers)
│   ├── services/           # Business logic and API services
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility/helper functions
├── public/                 # Static assets (images, icons, etc.)
├── package.json            # Project metadata and scripts
├── tsconfig.json           # TypeScript configuration
└── ...                     # Other config and documentation files
```

## Main Features

- **User Authentication & RBAC**: Secure login, role-based access control, and protected routes.
- **Tournament Management**: Create, edit, and manage tournaments, teams, matches, and stages.
- **Admin Tools**: User management, bulk actions, and statistics for administrators.
- **Audience Display**: Real-time audience view for tournament progress.
- **Match Control**: Schedule, control, and monitor matches with dialogs and status indicators.
- **Reusable UI Components**: Modular design for dialogs, forms, tables, and more.
- **WebSocket Support**: Real-time updates for matches and audience display.

## How to Contribute

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd RMS_FE
   pnpm install
   # or npm/yarn/bun install
   ```
2. Create a new branch for your feature or bugfix.
3. Follow the existing code style and structure.
4. Submit a pull request with a clear description of your changes.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Tutorial](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)

## Deployment

Deploy your Next.js app easily on [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

For more information, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).


