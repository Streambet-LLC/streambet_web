# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/339f5b56-0713-4470-9038-5efef14bc4f3

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/339f5b56-0713-4470-9038-5efef14bc4f3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/339f5b56-0713-4470-9038-5efef14bc4f3) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

## Development Workflow

### Code Quality Tools

This project uses several tools to ensure code quality:

- **ESLint**: Lints JavaScript and TypeScript code
- **Prettier**: Formats code consistently
- **Husky**: Runs checks before commits
- **lint-staged**: Runs linters on staged files only
- **commitlint**: Ensures commit messages follow conventional commit format

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

### Example Workflow

1. Make your changes
2. Stage your changes: `git add .`
3. Commit using the conventional format:
   - Use `npm run commit` for an interactive prompt
   - Or manually: `git commit -m "feat: add new button component"`
4. Push your changes: `git push`

The pre-commit hook will automatically run linters and formatters on your staged files.

### Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run lint` - Lint the codebase
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run commit` - Interactive commit message helper
