# My Attendance by Group 6: CIT 1201 coded prototype

A clickable prototype for one student journey: finding out how many more lectures you can miss in a course before the absence limit, and what to do about it. It uses sample data only. No real student information is collected, stored or sent, and the sign-in is not real security.

## Sign in

| Who | Username | Password |
| --- | --- | --- |
| Group 6 members | First name in English or Arabic (omar, bassam, faris, faisal, mohammed, musaed) | `group6` |
| Anyone else (for example the lecturer) | Press **Try the sample student account** | none |

The sign-in page never asks for a university password, and nothing typed there leaves the browser.

## Screens

| ID | Screen | Address |
| --- | --- | --- |
| — | Sign in, with errors, show password and Caps Lock warning | `#/login` |
| SC1 | Your courses, sorted by risk, with status in text and icon | `#/` |
| SC2 | Course allowance: "You can miss 3 more lectures" and the allowance strip | `#/course/cit1201` |
| SC3 | Absence records with counted, excused and under-review labels | `#/course/cit1201/records` |
| SC4 | Excuse under review: what it means and both possible outcomes | `#/course/cit1201/records/cit-4` |
| SC5 | Close to limit and no absences left guidance | `#/course/math1050`, `#/course/stat1010` |
| SC6 | Report a wrong record, with validation, sending state and confirmation | `#/course/cit1201/records/cit-5/report` |
| — | About this prototype and Group 6 | `#/about` |

The account menu (top right) has **Larger text**, **About this prototype** and **Sign out**. Arabic and English are both supported; Arabic switches the page to right-to-left.

## Usability testing mode

Add `?test=1` to the address, for example `.../attendance-cit1201/?test=1`. A facilitator panel appears at the bottom with:

- **Reset sample data**: use between participants.
- **Make the next report fail to send**: shows the error and recovery state for SC6.
- **Evaluation record**: a page for the observer to record each task attempt (participant code, task, outcome, errors, help given, satisfaction 1–5, comment, observation). It shows a summary per task and downloads everything as a CSV file for the report. Records stay in that browser until downloaded or cleared. Use participant codes only, never names.

## Settings

At the top of `app.js`:

- `LIMIT_RATE`: share of lectures a student may miss (0.25 = 25%). Change it to your university's rule.
- `CLOSE_AT`: how many absences left counts as "Close to limit".
- `PASSWORD` and `ACCOUNTS`: the shared password and the member accounts.
- `DATA_UPDATED`: the "Attendance updated" time shown on screen.

## Files

- `index.html`: page structure and the Group 6 logo
- `styles.css`: layout, colours and responsive rules
- `app.js`: accounts, sample data, Arabic and English text, screens and behaviour

## AI use

The first version of this code was generated with Claude (an AI assistant) and then reviewed, changed and tested by Group 6. See section 3 of the Project Evidence Report.
