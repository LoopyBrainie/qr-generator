# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

签到码生成器 - A Tauri 2.0 desktop app that generates dynamic check-in QR codes.

## Development Commands

```bash
# Install frontend dependencies
npm install

# Rust development (from src-tauri directory)
cargo tauri dev      # run in development
cargo tauri build    # build for production
cargo tauri clean    # clean build artifacts
cargo build          # build Rust only
```

## Architecture

### Frontend

- [src/main.ts](src/main.ts) - UI logic, invokes Rust backend
- [src/index.html](src/index.html) - HTML + embedded templates
- [src/styles.css](src/styles.css) - Styling
- Uses qrcodejs (CDN) for QR rendering

### Backend

- [src-tauri/src/main.rs](src-tauri/src/main.rs) - Rust backend with `generate_qr_code` command

### Config

- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) - Tauri v2 config
- [src-tauri/Cargo.toml](src-tauri/Cargo.toml) - Rust dependencies
