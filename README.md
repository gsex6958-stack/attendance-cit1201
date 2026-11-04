# My Attendance by Group 6: CIT 1201 coded prototype

A clickable prototype for one student journey: finding out how many more lectures you can miss before being barred, then submitting an excuse for an absence and tracking the decision in the same place. It uses sample data only. No real student information is collected, stored or sent, and the sign-in is not real security.

## Sign in

| Who | Username | Password |
| --- | --- | --- |
| Group 6 members | First name in English or Arabic (omar, bassam, faris, faisal, mohammed, musaed) | `group6` |
| Anyone else (for example the lecturer) | Press **Try the sample student account** | none |

The sign-in page never asks for a university password, and nothing typed there leaves the browser.

## Phone frame

On a computer, the link opens the app inside a phone: a lock screen with two sample notifications (an absence recorded, an excuse under review), a home screen with the My Attendance icon, then the app itself. Tapping a notification opens the matching screen. On a phone the link opens the app directly, so usability tests are not affected. Add `?frame=0` to skip the frame on a computer. The frame is a presentation wrapper only; the screens tested are the same.

## Screens

| ID | Screen | Address |
| --- | --- | --- |
| — | Sign in, with errors, show password and Caps Lock warning | `#/login` |
| SC1 | Your courses, sorted by risk, with status in text and icon | `#/` |
| SC2 | Course allowance under both University of Tabuk limits (20% without excuse, 35% in total) | `#/course/cit1201` |
| SC3 | Absence records: without excuse, excused, excuse under review, late | `#/course/cit1201/records` |
| SC4 | Submit an excuse: reason, supporting document (simulated), note | `#/course/cit1201/records/cit-5/excuse` |
| SC5 | Excuse submitted: reference, expected decision date, effect on the allowance | after SC4 |
| SC6 | Track the excuse: timeline from submitted to decision, and both outcomes | `#/course/cit1201/records/cit-4` |
| — | Close to limit and no absences left guidance | `#/course/math1050`, `#/course/stat1010` |
| — | Report a record made by mistake | `#/course/cit1201/records/cit-1/report` |
| — | About this prototype and Group 6 | `#/about` |

The account menu (top right) has **Larger text**, **About this prototype** and **Sign out**. Arabic and English are both supported; Arabic switches the page to right-to-left.

## Absence rules used

As shown in myUT: a student is barred if absences without an excuse exceed 20% of lectures, or if all absences exceed 35%. All absences = without excuse + with excuse + times late. An excuse under review counts as without an excuse until it is decided (a design assumption to confirm).

## Iteration

Changes made after the evaluation findings (see slides 8 and 9):

- **I1, from EF1:** on the course page, the second number now says it applies only if excuses are accepted, and that the number at the top is the limit until then.
- **I2, from EF2:** the course page now says how many absences can still be excused, with **Submit an excuse** and **Track the excuse under review**.

## Usability testing mode

Add `?test=1` to the address, for example `.../attendance-cit1201/?test=1`. A facilitator panel appears at the bottom with:

- **Reset sample data**: use between participants.
- **Make the next submission fail**: shows the error and recovery state for the excuse and report forms.
- **Evaluation record**: a page for the observer to record each task attempt (participant code, task, outcome, errors, help given, satisfaction 1–5, comment, observation). It shows a summary per task and downloads everything as a CSV file for the report. Records stay in that browser until downloaded or cleared. Use participant codes only, never names.

## Settings

At the top of `app.js`:

- `UNEXCUSED_RATE` and `TOTAL_RATE`: the two University of Tabuk limits (0.20 and 0.35).
- `CLOSE_AT`: how many absences left counts as "Close to limit".
- `PASSWORD` and `ACCOUNTS`: the shared password and the member accounts.
- `DATA_UPDATED`: the "Attendance updated" time shown on screen.

## Files

- `index.html`: the phone frame for computers (lock screen, home screen, notifications); on a phone it opens `app.html` directly
- `app.html`: the app's page structure and the Group 6 logo
- `styles.css`: layout, colours and responsive rules
- `app.js`: accounts, sample data, Arabic and English text, screens and behaviour

Upload all five files together to the top of the repository.

## AI use

The first version of this code was generated with Claude (an AI assistant) and then reviewed, changed and tested by Group 6. See section 3 of the Project Evidence Report.
