# Putting the project on GitHub

## 1. Before you publish: data licences

The code is MIT-licensed. The **spectra are not yours or mine to relicense**; read [NOTICE.md](../NOTICE.md). In short:

- `data/lee.json` is LEE Filters' data. A **private** repository is fine for yourself. For a **public** repository, check LEE's terms or ask them.
- `data/pigments.json` has no stated source. Find out who measured it before making it public.

If you cannot clear either, publish without the data: delete the file, remove its lines from `src/js/manifest.txt` (the `data` line and the `app/datasets/….js` line), run `python3 tools/build.py`, and tell users to build their own with the scripts in `tools/`.

Also replace "the repository owner" in `LICENSE` with your name.

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

The repository contains `.github/workflows/pages.yml`, which builds the page and publishes it.

1. Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push a change (or open the **Actions** tab and run *Deploy page* by hand).
3. After a minute the page is live at `https://YOUR-NAME.github.io/gel-chromaticity-map/`.

On a free account Pages needs a public repository. Private repositories need a paid plan for Pages.

## 5. Checks on every push

`.github/workflows/ci.yml` builds the page, runs both test scripts, and fails if `dist/index.html` is out of date with `src/`. Look at the **Actions** tab for the result.

## 6. Releasing a change

```bash
python3 tools/build.py && node tests/maths.mjs && python3 tests/smoke.py
git add -A && git commit -m "Describe the change" && git push
```
