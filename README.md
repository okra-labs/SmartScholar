# SmartScholar

SmartScholar is a browser-based student toolkit by OkraLabs. It provides IAA GPA and tuition estimates, an IAA module catalogue, university links, a GPA target simulator, and a study planner.

The project is a static frontend. It has no account system, email service, application database, or backend API. Calculations run in the visitor's browser. Results and study tasks are not sent to a server; use the CSV export buttons to download copies. Refreshing or closing the page clears the current session's inputs and tasks.

## Features

- Weighted GPA calculation using the IAA grading scales represented in the data.
- Searchable IAA module catalogue with credits loaded from the catalogue.
- Custom GPA rows for modules not listed in the catalogue.
- GPA target simulator.
- Estimated tuition instalments after HESLB tuition support and prior payments.
- CSV export for GPA results, fee estimates, and study plans.
- University links and student guidance.

## Run locally with Python

Requires Python 3.8 or later. From the project root, run:

```bash
python3 run.py
```

Then open `http://localhost:8000`. On Windows, use `python run.py` if `python3` is not available.

The Python script uses the standard library's static file server. The application logic runs in the browser using HTML, CSS, and JavaScript.

## Free static deployment on Render

1. In Render, choose **New → Static Site** and connect this GitHub repository.
2. Set the branch to `main`.
3. Set **Publish Directory** to `public`. Leave the build command blank.
4. Create the site. Render will provide a public URL and can redeploy when changes are pushed to the connected branch.

The deployment needs no secrets, SMTP settings, database, or paid persistent storage.

## Academic data and GPA method

The catalogue is in `public/data/iaa-modules.json` and `public/data/iaa-modules.csv`. It contains 1,556 module records across 56 programme labels extracted from the IAA Prospectus 2023/2024. NTA levels are inferred from module codes where available. Some titles or classes may be incomplete or affected by the source PDF's formatting. Verify catalogue entries and grading rules against current official IAA publications before relying on them for formal academic decisions.

The GPA formula is:

`GPA = sum(grade points × credit hours) / sum(credit hours)`

The displayed cumulative GPA is truncated to one decimal place. The represented prospectus grading tables are:

- NTA Levels 4–5: A = 4, B = 3, C = 2, D = 1, F = 0.
- NTA Levels 6–8: A = 5, B+ = 4, B = 3, C = 2, D = 1, F = 0.

The prospectus grade-point table does not specify an NTA Level 9 mapping, so the GPA calculator does not produce a result for Level 9 modules.

## Fee estimates

The fee planner accepts total course tuition, HESLB tuition allocation, and tuition already paid. It deducts HESLB support first, then estimates payments of 40% before registration/admission, 20% before Continuous Assessment Tests (CAT), and 40% before University Examinations (UE). Rounding differences are applied to the final instalment. This estimate does not replace an official fee statement; confirm current amounts and due dates with IAA.

## Project structure

- `public/` — static website, client-side logic, styles, and IAA catalogue.
- `run.py` — local Python static file server.
- `DATA_SCHEMA.md` — recommended structure and provenance fields for academic data.
- `SECURITY.md` — privacy and security notes for the static application.

## License and data attribution

No software license is currently included. Unless a license is added, standard copyright applies and reuse, modification, and redistribution are not granted by this repository. Confirm the applicable rights and attribution requirements for the IAA prospectus-derived catalogue before redistributing it.
