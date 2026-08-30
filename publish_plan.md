# Distribution & Publishing Plan — Vibe Tasks

## Overview
This document outlines the strategy for distributing Vibe Tasks across multiple operating systems using native package managers. The goal is to provide a "one-command" installation experience for Windows, macOS, and Linux.

---

## 1. Windows Distribution (Chocolatey & WinGet)

### A. Chocolatey
- **Package Type:** `.nupkg`
- **Installation Method:** PowerShell script (`chocolateyInstall.ps1`)
- **Process:**
  - Create a `.nuspec` metadata file.
  - Script will fetch the latest `.exe` from GitHub Releases.
  - Install to `C:\Program Files\Vibe Tasks`.
  - Create Start Menu and Desktop shortcuts.
  - Register in "Add/Remove Programs".

### B. WinGet (Windows Package Manager)
- **Package Type:** Manifest YAML
- **Process:**
  - Create a WinGet manifest (`vibe-tasks.yaml`).
  - Define the `installer` as the GitHub Release `.exe` or `.msi`.
  - Submit the manifest to the `microsoft/winget-pkgs` community repository.
  - Enable automatic updates by linking to the GitHub release tag.

---

## 2. macOS Distribution (Homebrew)

### Homebrew Cask
- **Package Type:** Ruby DSL (Cask)
- **Process:**
  - Create a `vibe-tasks.rb` cask file.
  - Point the `url` to the latest `.dmg` or `.zip` on GitHub Releases.
  - Use `sha256` checksum for security verification.
  - Define `app_name` and `category` (Productivity).
  - Submit a PR to `homebrew-cask`.

---

## 3. Linux Distribution (APT & Flatpak/AppImage)

### A. APT (Debian/Ubuntu)
- **Package Type:** `.deb`
- **Process:**
  - Use `electron-builder` to generate the `.deb` package.
  - **Option 1 (Manual):** Users download and run `sudo dpkg -i vibetasks.deb`.
  - **Option 2 (Repo):** Host a PPA (Personal Package Archive) or a custom APT repository using `reprepro` to allow `apt-get update` and `apt-get install`.

### B. Flatpak (Universal Linux)
- **Package Type:** Flatpak Bundle
- **Process:**
  - Create a Flatpak manifest.
  - Bundle the application and its dependencies.
  - Upload to **Flathub** for wide distribution across all distros.

---

## 4. Global Release Workflow

To ensure all package managers stay in sync, the following workflow is proposed:

1. **GitHub Release:** 
   - Build `.exe` (Win), `.dmg` (Mac), `.deb` (Linux).
   - Upload artifacts to a new tagged release (e.g., `v1.13.1`).
2. **Manifest Updates:**
   - Update `vibetasks.nuspec` (Chocolatey).
   - Update `vibe-tasks.yaml` (WinGet).
   - Update `vibe-tasks.rb` (Homebrew).
3. **Notification:** 
   - Push updates to respective community repositories.

## 5. Summary Matrix

| OS | Manager | Format | Source | Effort |
|---|---|---|---|---|
| **Windows** | Chocolatey | `.nupkg` | GitHub Release | Medium |
| **Windows** | WinGet | Manifest | GitHub Release | Low |
| **macOS** | Homebrew | Cask | GitHub Release | Low |
| **Linux** | APT | `.deb` | GitHub Release / PPA | High |
| **Linux** | Flatpak | Bundle | Flathub | Medium |
