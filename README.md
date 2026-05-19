# Learnify Music LMS

Music learning platform with a React frontend, Express backend, and PostgreSQL database.

## Project Structure

```text
learnify/
|-- src/                  React frontend
|-- server/               Express backend
|   |-- config/           Database connection
|   |-- controllers/      Route logic
|   |-- middleware/       Auth middleware
|   |-- routes/           API routes
|   |-- database/         PostgreSQL schema and seed files
|   `-- .env.example      Backend environment template
|-- docker-compose.yml    PostgreSQL container
|-- package.json          Frontend package
`-- README.md
```

## Database Structure

The PostgreSQL database contains these main tables:

1. `users` for student accounts
2. `courses` for instrument courses
3. `lessons` for videos inside each course
4. `quizzes` for lesson questions
5. `user_courses` for purchased or enrolled courses

Schema file:

- [server/database/schema.sql](/D:/ms/learnify-platform/learnify/server/database/schema.sql)

Seed file:

- [server/database/seed.sql](/D:/ms/learnify-platform/learnify/server/database/seed.sql)

## Run PostgreSQL

Start PostgreSQL with Docker:

```bash
docker compose up -d
```

The database container uses:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=lms_db
```

Create your backend env file:

```bash
copy server\.env.example server\.env
```

Then run the backend:

```bash
cd server
npm install
npm run dev
```

Run the frontend in another terminal:

```bash
npm run dev
```

When the backend starts, it automatically creates the schema and sample course data from:

- `server/database/schema.sql`
- `server/database/seed.sql`

## Connect In pgAdmin

Create a new server in pgAdmin with these values:

1. `Name`: `Learnify PostgreSQL`
2. `Host name/address`: `localhost`
3. `Port`: `5432`
4. `Maintenance database`: `lms_db`
5. `Username`: `postgres`
6. `Password`: `password`

After connecting, open:

`Servers > Learnify PostgreSQL > Databases > lms_db > Schemas > public > Tables`

You should see:

- `users`
- `courses`
- `lessons`
- `quizzes`
- `user_courses`

## Assignment Separation

This project is now clearly separated into:

1. Frontend: `src/`
2. Backend: `server/`
3. Database: `server/database/`

## Deployment

### Vercel frontend

This repo includes [vercel.json](/D:/ms/learnify-platform/learnify/vercel.json) so Vercel can serve the Vite app as a Single Page Application with deep-link support.

Use these Vercel project settings:

1. Framework preset: `Vite`
2. Root directory: repository root
3. Build command: `npm run build`
4. Output directory: `dist`

Set these environment variables in Vercel:

```env
VITE_API_URL=https://your-render-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Render backend

This repo includes [render.yaml](/D:/ms/learnify-platform/learnify/render.yaml) for the Express API.

The Render service uses:

1. Root directory: `server`
2. Build command: `npm install`
3. Start command: `npm start`
4. Health check path: `/healthz`

Set these environment variables in Render:

```env
DATABASE_URL=your_postgres_connection_string
DB_SSL=true
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id_here
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
GEMINI_API_KEY=your_gemini_api_key_here
```
