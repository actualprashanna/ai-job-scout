# AI Job Scout

An intelligent, full-stack career assistant powered by **Django REST Framework**, **React + Vite**, **Tailwind CSS**, and **Google's Gemini AI SDK**. 

AI Job Scout transforms any raw job title, profession, or description into targeted global search queries, fetches real-time web job listings, and provides instant, percentage-based CV fit scoring with actionable strength-and-gap feedback.

---

## Features

* **Universal AI Search (Module 01):** Type any role worldwide (e.g., *Offshore Wind Technician*, *ICU Nurse*, *Python Developer*, *Barista*) or pick a quick industry category.
* **Gemini Dork Engine (Module 02):** Automatically translates user input into high-conversion search dorks targeting LinkedIn, Merojob, JobsNepal, Greenhouse, and Lever.
* **Live Job Board Fetcher:** Parses real web listings or provides direct career portal deep-links instantly.
* **CV Fit Analyzer (Module 03):** Upload any candidate PDF CV and a target job description to get a **30% to 100% fit score**, key matching strengths, and missing skill gaps.
* **Interactive Job Management:** Save and bookmark listings, filter results live by keyword, and sync job postings directly to the CV analyzer with a single click.

---

## Tech Stack

* **Backend:** Django 6.0, Django REST Framework, Google GenAI SDK (`google-genai`), `pypdf`, `python-dotenv`, `django-cors-headers`
* **Frontend:** React, Vite, Tailwind CSS (v4), Lucide Icons
* **AI Model:** Gemini 2.5 Flash

---

## Project Structure

```text
ai-job-scout/
│
├── job_scout_backend/         # Django project settings & configs
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── scout_api/                 # Django app for AI and search logic
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── services.py            # Gemini and live web search engine
│   ├── tests.py
│   ├── urls.py
│   └── views.py
│
├── frontend/                  # React + Vite frontend application
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── .env                       # Environment variables (Secrets)
├── .gitignore
├── db.sqlite3                 # Local SQLite database
├── manage.py                  # Django management script
└── README.md
