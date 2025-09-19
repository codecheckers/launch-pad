# CODECHECK Launch Pad

A single page application that helps create new issues for the CODECHECK Register by identifying the next available certificate identifier and setting the correct tags for different types of CODECHECK issues.

The app queries the GitHub API to analyze existing issues in both the [testing register](https://github.com/codecheckers/testing-dev-register) and [production register](https://github.com/codecheckers/register) repositories, calculates the next sequential certificate identifier, and generates properly formatted GitHub issues with appropriate templates and labels.

## Features

- 🔢 **Smart Identifier Calculation**: Automatically finds the next available certificate identifier
- 🏷️ **Unified Template**: Single template for all CODECHECK works
- 🔄 **Repository Selection**: Toggle between testing and production registers
- 📋 **Template Generation**: Pre-filled issue templates with proper formatting
- 🎯 **Direct GitHub Integration**: One-click issue creation with correct labels
- 📊 **Repository Statistics**: View register metrics and analysis results
- 📱 **Responsive Design**: Mobile-friendly interface
- 🎨 **Consistent CODECHECK Branding**: Matches codecheck.org.uk design

## Quick Start

1. **Download dependencies:**

   ```bash
   npm run download-deps
   ```

2. **Start the development server:**

   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:8000`

## Available Scripts

### `npm start`

Starts a local development server on port 8000 using Python's built-in HTTP server.

- **Command:** `python3 -m http.server 8000`
- **Access:** <http://localhost:8000>

### `npm run serve`

Alternative command to start the development server (same as `npm start`).

- **Command:** `python3 -m http.server 8000`
- **Access:** <http://localhost:8000>

### `npm run download-deps`

Downloads all required JavaScript and CSS dependencies locally. This ensures the app works offline and doesn't rely on CDNs.

- **Downloads:** jQuery 3.7.1, Bootstrap 5.3.2, and Papa Parse 5.4.1
- **Run this first** before starting the application

### `npm run download-jquery`

Downloads only the jQuery library to `assets/js/jquery.min.js`.

- **Source:** <https://code.jquery.com/jquery-3.7.1.min.js>
- **Output:** `assets/js/jquery.min.js`

### `npm run download-bootstrap`

Downloads Bootstrap CSS and JavaScript files to the assets directory.

- **CSS Source:** <https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css>
- **JS Source:** <https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js>
- **Output:** `assets/css/bootstrap.min.css` and `assets/js/bootstrap.min.js`

### `npm run download-papaparse`

Downloads the Papa Parse CSV parsing library to handle codechecker data.

- **Source:** <https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js>
- **Output:** `assets/js/papaparse.min.js`

## How It Works

1. **Repository Analysis**: The app fetches all issues from the selected GitHub repository
2. **Identifier Extraction**: Uses regex patterns to find existing certificate identifiers (format: YYYY.NNNNN)
3. **Next ID Calculation**: Determines the next sequential number available for the current year
4. **Template Generation**: Creates issue titles, bodies, and labels for CODECHECK works
5. **GitHub Integration**: Generates pre-filled GitHub issue creation URLs

## Deployment

This application is designed for static hosting and is fully compatible with GitHub Pages:

1. Push your changes to the `main` branch
2. Enable GitHub Pages in repository settings
3. Set source to "Deploy from a branch" → `main` → `/ (root)`
4. Your app will be available at `https://codecheckers.github.io/register-starter`

## Project Structure

```txt
register-starter/
├── index.html                # Main entry point
├── package.json              # Project configuration and scripts
├── assets/
│   ├── css/
│   │   ├── bootstrap.min.css # Bootstrap CSS (downloaded)
│   │   └── main.css          # Custom CODECHECK styles
│   ├── js/
│   │   ├── jquery.min.js     # jQuery library (downloaded)
│   │   ├── bootstrap.min.js  # Bootstrap JS (downloaded)
│   │   ├── papaparse.min.js  # Papa Parse CSV library (downloaded)
│   │   ├── config.js         # Configuration and constants
│   │   ├── github-api.js     # GitHub API client
│   │   ├── codechecker-manager.js # Codechecker data management
│   │   ├── ui.js             # UI management and event handling
│   │   └── app.js            # Main application logic
│   └── images/               # Icons and images
├── README.md                 # This file
├── LICENSE                   # MIT License
└── CLAUDE.md                 # Project guidelines
```

## Libraries and Licenses

This project uses the following third-party libraries:

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [jQuery](https://jquery.com/) | 3.7.1 | MIT | DOM manipulation and AJAX requests |
| [Bootstrap](https://getbootstrap.com/) | 5.3.2 | MIT | CSS framework for responsive design |
| [Papa Parse](https://www.papaparse.com/) | 5.4.1 | MIT | CSV parsing for codechecker data |

All libraries are distributed under the MIT License, which is compatible with this project's Apache License 2.0.

## Configuration

The application supports different repository configurations:

### Repositories

- **Testing Register**: `codecheckers/testing-dev-register` (for development)
- **Production Register**: `codecheckers/register` (for live certificates)

### Issue Template

The application uses a single, unified template for all CODECHECK works, regardless of publication status or type.

## Requirements

- **Python 3** (for local development server)
- **curl** (for downloading dependencies)
- **Modern web browser** with JavaScript enabled
- **Internet connection** (for GitHub API access)

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.
