# CHAIN55

CHAIN55 is a web-based blockchain simulation and learning platform. It allows users to configure agent-based blockchain simulations, select consensus mechanisms and network topologies, monitor live execution, and inspect metrics such as mainchain rate, branching ratio, Gini coefficient, and simulation duration.

## Features

- Configure blockchain network simulations
- Select different consensus mechanisms
- Simulate multiple network topologies
- Monitor simulations with live WebSocket updates
- Store simulation configurations and results in MongoDB
- Process simulation jobs asynchronously using RabbitMQ
- Review simulation history and completed results
- Explore learning material about blockchain systems and agent-based modeling
- Use an interactive React-based interface with animated visual effects

## Technology Stack

### Frontend

- React 19
- Vite
- JavaScript and JSX
- React Router
- Axios
- Framer Motion
- STOMP.js and SockJS
- Lenis smooth scrolling
- Lucide React

### Backend

- Java 17
- Spring Boot
- Spring Web
- Spring WebSocket
- Spring Data MongoDB
- Spring AMQP
- Maven

### Infrastructure

- MongoDB
- RabbitMQ
- Docker Compose

## Project Structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── InteractiveShape.jsx
│   │   ├── pages/
│   │   │   ├── Simulation.jsx
│   │   │   ├── Learning.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Abstract.jsx
│   │   │   └── Manual.jsx
│   │   └── assets/
│   ├── package.json
│   └── vite.config.js
│
├── Backend/
│   └── Backend/
│       ├── src/main/java/
│       │   ├── com/ProB/Backend/
│       │   │   └── BackendApplication.java
│       │   └── com/sim/
│       │       ├── config/
│       │       ├── controller/
│       │       ├── model/
│       │       ├── repository/
│       │       ├── service/
│       │       └── worker/
│       ├── src/main/resources/
│       │   └── application.yaml
│       └── pom.xml
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Application Flow

1. The user configures a simulation in the React frontend.
2. The frontend sends the configuration to the Spring Boot backend.
3. `SimulationController` receives the request through the REST API.
4. `SimulationOrchestratorService` stores the configuration in MongoDB.
5. The simulation job is published to RabbitMQ.
6. `SimulationWorker` consumes the job and executes the simulation.
7. Tick updates and final results are published through RabbitMQ.
8. WebSocket/STOMP streams live updates to the frontend.
9. The frontend displays live progress, history, and final metrics.

## Prerequisites

Install the following before running the project:

- Java 17 or later
- Node.js and npm
- Docker and Docker Compose
- Git

## Running the Infrastructure

Start MongoDB and RabbitMQ using Docker Compose:

```bash
docker compose up -d
```

The services use the following ports:

| Service | Address |
| --- | --- |
| MongoDB | `localhost:27017` |
| RabbitMQ | `localhost:5672` |
| RabbitMQ Management UI | `http://localhost:15672` |

RabbitMQ credentials:

```text
Username: guest
Password: guest
```

To stop the services:

```bash
docker compose down
```

## Running the Backend

Open a new terminal and run:

```bash
cd Backend/Backend
./mvnw spring-boot:run
```

On Windows:

```bat
cd Backend\Backend
mvnw.cmd spring-boot:run
```

The backend uses the following configuration:

```text
MongoDB:  mongodb://localhost:27017/simulation_db
RabbitMQ: localhost:5672
API:      http://localhost:8080
```

To build the backend:

```bash
./mvnw clean package
```

## Running the Frontend

Open another terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at the Vite development URL displayed in the terminal, normally:

```text
http://localhost:5173
```

### Frontend Commands

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run preview   # Preview the production build
npm run lint      # Run Oxlint
```

## Frontend Routes

| Route | Description |
| --- | --- |
| `/` | Simulation page |
| `/simulation` | Configure and monitor simulations |
| `/learning` | Learn about blockchain concepts and simulation mechanics |
| `/dashboard` | View the dashboard interface |
| `/abstract` | Read the project research abstract |
| `/manual` | Read the simulation usage guide |

## REST API

The backend exposes the following endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/simulations/start` | Start a new simulation |
| `GET` | `/api/simulations/history` | Retrieve simulation history |
| `GET` | `/api/simulations/{id}/result` | Retrieve results for a simulation |

### Start a Simulation

Example request:

```json
{
  "nodeCount": 10,
  "consensusType": "PoW",
  "networkTopology": "Erdos-Renyi",
  "blockGossipLatency": 0.5,
  "slotDuration": 1.0
}
```

## WebSocket Updates

The frontend connects to the backend using SockJS and STOMP.

WebSocket endpoint:

```text
/ws-simulation
```

Live simulation topic:

```text
/topic/simulation/{simulationId}
```

Simulation result topic:

```text
/topic/simulation/{simulationId}/result
```

## Simulation Configuration

The simulation interface supports the following parameters.

### Consensus Mechanisms

- Proof of Work (`PoW`)
- Proof of Stake (`PoS`)
- Delegated Proof of Stake (`DPoS`)
- Proof of Authority (`PoA`)
- Proof of Location (`PoL`)

### Network Topologies

- Erdos-Renyi
- Small-World
- Scale-Free

### Additional Parameters

- Node count
- Block gossip latency
- Slot duration

## Simulation Results

Completed simulations report the following metrics:

- **Mainchain Rate:** The proportion of blocks that remain on the main chain
- **Branching Ratio:** A measure of chain branching and fork activity
- **Final Gini Coefficient:** A measure of distribution inequality across the simulation
- **Duration:** Total simulation execution time

The current worker implementation runs a ten-tick simulation, publishes intermediate tick updates, and then publishes a final result.

## Repository Language Composition

The repository is primarily composed of:

| Language | Approximate Share |
| --- | ---: |
| JavaScript | 56.8% |
| Java | 28.7% |
| CSS | 13.9% |
| HTML | 0.6% |

## Project Status

CHAIN55 is currently a prototype combining a React/Vite frontend with a Spring Boot simulation backend.

The simulation pipeline is connected to MongoDB, RabbitMQ, and WebSockets. Some dashboard content is currently static presentation data, while simulation history and simulation results are retrieved from the backend.

## Troubleshooting

### Frontend cannot connect to the backend

Ensure the backend is running on:

```text
http://localhost:8080
```

The frontend currently uses:

```text
http://localhost:8080/api/simulations
http://localhost:8080/ws-simulation
```

### MongoDB connection errors

Confirm that MongoDB is running:

```bash
docker compose ps
```

You can also inspect the MongoDB container logs:

```bash
docker compose logs mongodb
```

### RabbitMQ connection errors

Confirm that RabbitMQ is running:

```bash
docker compose logs rabbitmq
```

The default configuration uses:

```text
Host: localhost
Port: 5672
Username: guest
Password: guest
```

## License

No license has been specified for this repository yet.