# Vacations - Trello Power-Up

A board-level Trello Power-Up for tracking team vacations.

## Features

- Board button with vacation icon and the number of currently active vacations.
- Card front badge showing how many assigned members are on vacation today.
- Card detail badge listing assigned members who are on vacation today.
- Fullscreen modal dashboard with all board members who have saved vacation dates.
- Current member can add and remove only their own vacation ranges from the UI.
- Vacation data is stored in board-scoped shared Power-Up data.

## Setup

1. Host this folder on a public HTTPS server, such as GitHub Pages.
2. Create a new Power-Up at https://trello.com/power-ups/admin.
3. Set the iframe connector URL to the hosted `index.html`.
4. Enable the `board-buttons`, `card-badges`, and `card-detail-badges` capabilities.
5. Enable the Power-Up on your Trello board from the Custom Power-Ups tab.

If GitHub Pages publishes this repository at its standard project URL, the connector URL should be:

```text
https://tomlatyn.github.io/trello-powerups/trello-vacations/index.html
```

Use `manifest.json` as the Power-Up manifest if Trello asks for it, or enter the
same values manually in the Power-Up admin UI.

## Storage

Vacation data is stored under board/shared pluginData key `vacations`.
Everyone who can read the board can read this data. The UI only lets the
current Trello member edit their own ranges.

## Local Preview

Run a static server from this folder:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/local-preview/
```

The preview uses seeded localStorage data and a mock Trello SDK.
