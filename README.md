# Fortress Stack

An On-premise AI platform with model serving, API backend, demo application, admin dashboard, and monitoring.

---

## Features

- **Model Server**: FastAPI-based, runs HuggingFace models locally or from HF Hub.
- **API Backend**: FastAPI gateway for authentication, business logic, and orchestration.
- **Demo Application**: React-based chat UI for interacting with LLMs.
- **Admin Dashboard**: React dashboard for system health, usage, and management.
- **Monitoring**: Prometheus and Grafana for metrics and visualization.
- **Docker Compose**: One command to build and run all services.

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed

### Clone & Run

```sh
git clone https://github.com/DevMubzly/fortress-stack-v1.git
cd fortress-stack-v1
docker compose build
docker compose up
```

### Access Services

- **Model Server**: [http://localhost:8000](http://localhost:8000)
- **API Backend**: [http://localhost:5000](http://localhost:5000)
- **Demo Application**: [http://localhost:1000](http://localhost:1000)
- **Admin Dashboard**: [http://localhost:3000](http://localhost:3000)

---

## Directory Structure

```
fortress-stack/
├── model-server/      # FastAPI model server
├── fastapi/           # API backend
├── demo-application/  # React demo chat app
├── admin-dash/        # React admin dashboard
├── prometheus/        # Prometheus config
├── docker-compose.yml # Multi-service orchestration
```

---

## Customization

- **Models**: Place local models in `model-server/models/`
- **Environment Variables**: See `docker-compose.yml` for configuration
- **Ports**: Change exposed ports in `docker-compose.yml` as needed

---

## License

MIT

---

## Contributing

Pull requests welcome! Please open issues for bugs or feature requests.
