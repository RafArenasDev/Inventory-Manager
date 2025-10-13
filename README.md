# Laravel React Starter Kit

A modern web application starter kit built with Laravel 12, React 19, and Inertia.js, designed for developers to quickly bootstrap projects with robust backend and frontend capabilities, including role-based permissions, PDF generation, and spreadsheet handling.

## Prerequisites

Ensure you have the following installed on your system:

- **PHP**: ^8.2
- **Composer**: Latest version
- **Node.js**: ^18.x or higher
- **NPM**: Latest version
- **MySQL/SQLite/PostgreSQL**: Database of your choice
- **Git**: For cloning the repository

## Installation

Follow these steps to set up the project after cloning or starting from scratch.

### 1. Clone the Repository

Clone the repository to your local machine:

```bash
git clone <repository-url>
cd laravel-react-starter-kit
```

### 2. Install PHP Dependencies

Install the required PHP dependencies using Composer:

```bash
composer install
```

### 3. Install JavaScript Dependencies

Install the required Node.js dependencies for the React frontend:

```bash
npm install
```

### 4. Set Up Environment File

Copy the `.env.example` file to create a `.env` file:

```bash
cp .env.example .env
```

Update the `.env` file with your database credentials and other configurations (e.g., `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

### 5. Generate Application Key

Generate a new application key for Laravel:

```bash
php artisan key:generate
```

### 6. Link Storage

Create a symbolic link from `public/storage` to `storage/app/public` for file storage:

```bash
php artisan storage:link
```

### 7. Run Migrations and Seeders

Run the database migrations with seeders to set up the database schema and populate it with initial data:

```bash
php artisan migrate:fresh --seed
```

> **Note**: The `--fresh` flag drops all existing tables before running migrations. Remove it if you want to preserve existing data.

### 8. Build Frontend Assets

Compile the React frontend assets using Vite:

```bash
npm run build
```

For development with hot-reloading, use:

```bash
npm run dev
```

### 9. Run the Application

Start the Laravel development server, queue listener, and Vite dev server concurrently:

```bash
composer run dev
```

This command runs:

- `php artisan serve` (Laravel server)
- `php artisan queue:listen --tries=1` (Queue listener)
- `npm run dev` (Vite for React frontend)

Alternatively, if you want to enable Server-Side Rendering (SSR) for Inertia.js, run:

```bash
composer run dev:ssr
```

This command includes an additional `php artisan inertia:start-ssr` process for SSR.

### 10. Run Tests (Optional)

To run the test suite, use:

```bash
composer run test
```

This clears the configuration cache and runs PHPUnit tests.

## Additional Commands

- **Clear Configuration Cache**:

  ```bash
  php artisan config:clear
  ```
- **Run Laravel Tinker**:

  ```bash
  php artisan tinker
  ```
- **Generate PDF with DomPDF**:
  Ensure `barryvdh/laravel-dompdf` is configured in your `.env` file if you need specific settings.
- **Manage Permissions with Spatie**:
  Use Spatie's Laravel Permission package for role and permission management. Refer to [Spatie Laravel Permission documentation](https://spatie.be/docs/laravel-permission) for details.
- **Ziggy for Routes**:
  Access Laravel routes in JavaScript using Ziggy. Run `php artisan ziggy:generate` to generate the route file if needed.

## Project Structure

- **Backend**: Laravel 12 (`app/`, `routes/`, `database/`)
- **Frontend**: React 19 with Inertia.js (`resources/js/`)
- **Assets**: Managed by Vite (`vite.config.js`)
- **Storage**: Public files stored in `storage/app/public`, accessible via `public/storage`

## Available Scripts

The following Composer scripts are available:

- `composer run dev`: Runs the development server, queue listener, and Vite.
- `composer run dev:ssr`: Runs the development server, queue listener, logs, and SSR.
- `composer run test`: Runs the test suite.

## Troubleshooting

- **Database Connection Issues**: Ensure your `.env` file has the correct database credentials and the database server is running.
- **Node Modules Errors**: Delete `node_modules` and `package-lock.json`, then run `npm install` again.
- **Permission Issues**: Ensure the `storage/` and `bootstrap/cache/` directories are writable:
  ```bash
  chmod -R 775 storage bootstrap/cache
  ```

## Contributing

Feel free to submit issues or pull requests to improve the project. Ensure you follow the coding standards enforced by Laravel Pint (`composer run pint`).

## License

This project is licensed under the MIT License.
