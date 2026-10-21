# Putting the project on GitHub

## 1. Before you publish: data licences

The code is licensed under the GNU AGPL-3.0-or-later. The **spectra are not yours or mine to relicense**; read [NOTICE.md](../NOTICE.md). In short:

- No LEE data is in the repository (`data/lee.json` is git-ignored). Keep it that way unless LEE permits redistribution.
- `data/pigments.json`: the owner has the rights to publish it.
- `data/gels.json` is synthetic; `colorchecker.json` and the CRI/TM-30 tables come from colour-science (see `NOTICE.md`).

If you cannot clear either, publish without the data: delete the file, remove its lines from `src/js/manifest.txt` (the `data` line and the `app/datasets/….js` line), run `python3 tools/build.py`, and tell users to build their own with the scripts in `tools/`.

The AGPL requires that people who use a modified copy over a network can get its source. If you host a modified version, offer its source, for example with a link in the page footer.

## 2. Create the repository

On github.com: **New repository**, name it (for example `gel-chromaticity-map`), choose Private or Public, leave "Add a README" **unticked** (this project already has one), and create it. GitHub then shows an address like `https://github.com/YOUR-NAME/gel-chromaticity-map.git`.

## 3. Upload it

**With git (recommended):** in a terminal, inside the project folder:

```bash
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-NAME/gel-chromaticity-map.git
git push -u origin main
```
GitHub no longer accepts account passwords on the command line. When asked for a password, paste a **personal access token** (GitHub → Settings → Developer settings → Personal access tokens), or install [GitHub Desktop](https://desktop.github.com/) or the GitHub CLI (`gh auth login`) and use that to sign in.

**Without git:** on the new repository's page choose **uploading an existing file**, drag the *contents* of the project folder into the page (not the zip itself; unzip first, and keep the folder structure; GitHub's web uploader accepts folders by drag and drop), then **Commit changes**. The web uploader limits a single upload to 100 files; this project has fewer.

## 4. Host the page (GitHub Pages)

The repository contains `.github/workflows/pages.yml`, which builds the page and publishes the `dist/` folder.

1. Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push a change, or open the **Actions** tab and run *Deploy page* by hand.
3. After a minute the page is live at `https://YOUR-NAME.github.io/gel-chromaticity-map/`. The first run may ask you to approve the `github-pages` environment under Settings → Environments.

On a free account Pages needs a **public** repository (private repositories need a paid plan). A public repository means the data files are public too: see step 1.

## 5. Use it like an app

The page is a progressive web app: it has a manifest, icons and a service worker, so a browser can install it and it opens offline after the first visit. It must be opened from the `https://…github.io/…` address (not from a downloaded file) for this to work.

| Device | How to install |
|---|---|
| Chrome or Edge on a computer | Click the install icon (a monitor with a down arrow) at the right end of the address bar, or menu → *Install Spectral Colour Test Lab* |
| Android (Chrome) | Menu (⋮) → *Install app* or *Add to Home screen* |
| iPhone / iPad (Safari) | Share button → *Add to Home Screen* |

Offline, the Google fonts are not available and the page uses your system fonts instead. After installing it opens in its own window with no browser bars. Everything you load (your own CSV files) stays in your browser session only; nothing is uploaded. Imported data is not saved between visits.

**Updates.** When you push a new version, the next time the app is opened online it fetches the new page and refreshes its offline copy. Close and reopen the app once to see the change.

**Custom address.** To use your own domain, add it under Settings → Pages → Custom domain.

## 6. Checks on every push

`.github/workflows/ci.yml` builds the page, runs both test scripts, and fails if `dist/index.html` is out of date with `src/`. Look at the **Actions** tab for the result.

## 7. Releasing a change

```bash
python3 tools/build.py && node tests/maths.mjs && python3 tests/smoke.py
git add -A && git commit -m "Describe the change" && git push
```
