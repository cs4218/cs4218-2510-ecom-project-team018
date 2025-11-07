# Docker Container Setup for Performance testing

1. **Prerequisites**
   - Docker Engine 20.10+ with the Docker Compose plugin (`docker compose` CLI).
   - A valid `.env` file in the project root (copy from `.env.example`) that includes your MongoDB Atlas URI and other secrets. The frontend may also read values from `client/.env`.

2. **Build Images**
   ```bash
   docker compose build
   ```
   This compiles the React frontend into a static bundle and prepares the Node backend image.

3. **Run Containers**
   ```bash
   docker compose up -d
   ```
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:6060`
   Logs: `docker compose logs -f frontend` or `backend`.

4. **Resource Limits**
   The Compose file applies CPU/RAM caps via `deploy.resources` (2 CPU / 2 GB for backend, 1 CPU / 1 GB for frontend). Run `docker stats` to monitor usage.

5. **Stopping / Cleaning Up**
   ```bash
   docker compose down        # stop containers
   docker compose down -v     # stop and remove named volumes if added later
   ```

6. **Rebuilding With Changes**
   When you update dependencies or frontend code, rebuild to refresh images:
   ```bash
   docker compose build frontend   # just the UI
   docker compose build backend    # just the API
   ```

After running the containers, continue with performance tests.
