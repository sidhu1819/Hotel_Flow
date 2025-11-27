## Local Database & Environment Setup

1. **Start Postgres locally**
   - Install Docker Desktop.
   - From the project root run:
     ```
     docker compose up -d
     ```
   - This launches a Postgres 16 container exposed on `localhost:5433` with database `hotelflow`.

2. **Create your `.env` file (same folder as `package.json`)**
   - Copy the snippet below into a new `.env` file:
     ```
     PORT=5001
     DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hotelflow
     DATABASE_SSL=false
     ```
   - `DATABASE_SSL=false` ensures the server does not try to negotiate SSL against the local container.

3. **Apply database schema**
   - Install dependencies: `npm install`
   - Push the schema: `npm run db:push`

4. **Run the app**
   - `npm run dev`
   - Visit http://localhost:5001 and register/login with the seeded credentials or create a new account.

If you already have a local Postgres instance running outside Docker, adjust `DATABASE_URL` accordingly (e.g., change the port or credentials). Remove the `DATABASE_SSL` line whenever you switch to a hosted database that requires TLS.

