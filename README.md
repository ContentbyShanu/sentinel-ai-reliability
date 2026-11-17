 SENTINEL AI

Reliability Intelligence Workspace

Make Reliability Visible. Build with Confidence.

Sentinel AI is a software project reliability workspace designed to bring project organisation, review workflows, activity tracking, reporting, and workspace analytics into one structured interface.

Built with a focus on clarity, usability, and a refined dashboard experience, Sentinel AI helps developers organise their projects and maintain a central view of their review activity.

---

Overview

Managing multiple software projects often means switching between different tools to track project information, review activity, and progress.

Sentinel AI brings these activities together in a single workspace.

The application provides a central dashboard where users can organise projects, configure review workflow previews, monitor recorded activity, generate CSV reports, and explore project analytics.

Its interface combines a clean layout, responsive navigation, visual data summaries, and browser-based data persistence.

Key Features

1. Intelligent Workspace Dashboard

A central overview of the workspace, designed to make important information accessible at a glance.

- Total project count
- Workspace status overview
- Recorded activity statistics
- Reliability overview chart
- Recent activity timeline
- Quick navigation to important workspace sections

2. Project Management

Manage software projects from a dedicated project workspace.

- Create new projects
- Edit existing project information
- Delete projects
- Search projects by name and description
- Filter projects by status
- Organise projects by type
- Maintain project records locally

3. Scan Workflow

A dedicated interface for configuring and running scan workflow previews.

- Select a project
- Choose an analysis profile
- Confirm project authorisation
- Follow workflow progress
- View completion status
- Save completed preview records

Current implementation note: The scan workflow currently operates as a frontend demonstration. It does not yet inspect source code, execute static analysis, or detect actual security vulnerabilities.

4. Scan History

A central timeline of previously recorded workflow previews.

- View project activity
- Review selected analysis profiles
- Check recorded dates and times
- Track preview completion records
- Clear stored history when required

5. Reports & Export

A dedicated reporting workspace for reviewing and exporting recorded activity.

- Search report records
- Review project information
- View recorded dates
- Export individual records
- Download all available records as CSV

6. Workspace Analytics

Visual summaries that help users understand their workspace.

- Project distribution
- Active project count
- Completed project count
- Archived project count
- Recorded preview activity
- Activity trend visualisation

7. Security & Preferences

Workspace controls designed to provide a more organised user experience.

- Workspace preferences
- Appearance controls
- Notification preference
- Local workspace data management
- Data-clearing option

8. Local Data Persistence

Sentinel AI uses browser Local Storage to retain workspace information.

Project records, settings, and preview history remain available after refreshing the browser in the same browser profile, provided its stored site data is not cleared.

---

Interface & Design

Sentinel AI uses a minimal, professional dashboard design.

Design direction:

- Light and neutral interface
- Warm gold accent details
- Refined typography
- Structured sidebar navigation
- Dashboard cards and visual summaries
- Clear spacing and information hierarchy
- Responsive layout for different screen sizes

The interface is designed to feel like a focused developer workspace rather than a generic administration template.

---

Technology Stack

Technology| Purpose
Python| Local development environment and static file serving
HTML5| Application structure
CSS3| Layout, styling and responsive interface
JavaScript| Navigation, interactions and workspace logic
Browser Local Storage| Local persistence of workspace records
Canvas API| Dashboard charts and visualisations

The current frontend does not require an external API key or third-party AI service.

---

Project Structure

sentinel-ai-reliability/
│
├── frontend/
│   ├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
│
├── data/
├── examples/
├── reports/
├── src/
├── tests/
│
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
├── docker-compose.yml
├── LICENSE
├── pyproject.toml
├── poetry.lock
└── README.md

---

Getting Started

Follow these instructions to run the current frontend locally.

Prerequisites

- Python 3 installed
- Git
- A modern web browser

1. Clone the Repository

git clone https://github.com/ContentbyShanu/sentinel-ai-reliability.git

2. Navigate to the Project

cd sentinel-ai-reliability

3. Start the Local Server

python -m http.server 8000 --directory frontend

4. Open Sentinel AI

Visit the following address in your browser:

http://localhost:8000

The Sentinel AI workspace should now be accessible locally.

---

Application Workflow

The current workspace follows this general workflow:

1. Open the dashboard.
2. Navigate to Projects.
3. Create or select a project.
4. Open the Scanner section.
5. Select a project and an analysis profile.
6. Confirm authorisation.
7. Run the workflow preview.
8. Review the recorded activity in Scan History.
9. Open Reports to export available records.
10. Explore workspace statistics in Analytics.

---

Data & Implementation Notes

Sentinel AI currently operates as a browser-based frontend workspace.

- Project information is stored locally in the browser.
- Workflow preview records are stored in browser Local Storage.
- CSV reports are generated from available local records.
- Dashboard analytics are calculated from workspace data.
- The current scanner is a demonstration workflow, not a source-code analysis engine.

Actual Python-based source-code inspection, dependency analysis, reliability checks, and vulnerability detection are not claimed as implemented capabilities in this version.

---

Future Development

Potential future development areas include:

- Python-based static source-code analysis
- Dependency and package inspection
- Reliability rule engine
- Structured issue classification
- Detailed analysis reports
- Backend integration
- Automated testing and validation
- More advanced project analytics

These are planned development directions, not features currently represented as complete.

---

Project Goals

Sentinel AI is being developed around a few core principles:

Clarity — Keep project information and activity easy to understand.

Organisation — Bring essential project workflows into one workspace.

Transparency — Make recorded activity and implementation status clear.

Practicality — Focus on useful developer workflows rather than unnecessary complexity.

---

Author

Shanu Kumar

GitHub: "@ContentbyShanu" (https://github.com/ContentbyShanu)

Project Repository: "Sentinel AI — Reliability Workspace" (https://github.com/ContentbyShanu/sentinel-ai-reliability)

---

License

See the "LICENSE" (LICENSE) file for licensing information.

---

Sentinel AI — A project reliability workspace built to make software workflows more organised, visible, and understandable.