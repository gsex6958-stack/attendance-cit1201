# My Attendance: CIT 1201 coded prototype

A clickable prototype for one student journey: finding out how many more lectures you can miss in a course before the absence limit, and what to do about it. It uses sample data only. No real student information is collected, stored or sent.

## Screens

| ID | Screen | Address |
| --- | --- | --- |
| SC1 | Your courses, sorted by risk, with status in text and icon | `#/` |
| SC2 | Course allowance: "You can miss 3 more lectures" and the allowance strip | `#/course/cit1201` |
| SC3 | Absence records with counted, excused and under-review labels | `#/course/cit1201/records` |
| SC4 | Excuse under review: what it means and both possible outcomes | `#/course/cit1201/records/cit-4` |
| SC5 | Close to limit and no absences left guidance | `#/course/math1050`, `#/course/stat1010` |
| SC6 | Report a wrong record, with validation, sending state and confirmation | `#/course/cit1201/records/cit-5/report` |

Arabic and English are both supported (button at the top right). Arabic switches the page to right-to-left.

## Run it

Open `index.html` in any browser. No installation or server is needed.

## Usability testing mode

Add `?test=1` to the address, for example `index.html?test=1`. A facilitator panel appears at the bottom with:

- **Reset sample data**: use between participants.
- **Make the next report fail to send**: shows the error and recovery state for SC6.

Reloading the page also resets everything.

## Settings

At the top of `app.js`:

- `LIMIT_RATE`: share of lectures a student may miss (0.25 = 25%). Change it to your university's rule.
- `CLOSE_AT`: how many absences left counts as "Close to limit".
- `DATA_UPDATED`: the "Attendance updated" time shown on screen.

## Files

- `index.html`: page structure
- `styles.css`: layout, colours and responsive rules
- `app.js`: sample data, Arabic and English text, screens and behaviour

## AI use

The first version of this code was generated with Claude (an AI assistant) and then reviewed, changed and tested by the group. See section 3 of the Project Evidence Report.
