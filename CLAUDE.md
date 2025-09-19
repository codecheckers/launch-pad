# Project: CODECHECK Launch Pad

## Purpose

A standalone JavaScript application that works against the GitHub Issues API to assist in creating new issues for the CODECHECK Register. The app helps to identify the next available identifier and to set the correct tags for new issues depending on the type of check. For development purposes it works towards the testing register at <https://github.com/codecheckers/testing-dev-register> and when deployed online as a GitHub page, it uses the real register at <https://github.com/codecheckers/register/>.

## Architecture

- Frontend: jQuery, Bootstrap and HTML5
- API: Using GitHub API
- Authentication: None (public data only)

## Coding Standards

- Component names are PascalCase
- Utility functions are camelCase
- We use functional components with hooks
- We do not load JS or CSS from CDNs, all dependencies are managed locally via npm
- We use libraries only from trusted sources with permissive licenses (MIT, Apache 2.0, etc.)
- We prefer small libraries with specific functionality over large frameworks and over own implentations of typical tasks

## Design Standards

- We use a consistent color scheme and typography based on the CODECHECK branding from the website at <https://codecheck.org.uk> and the logo files at <https://github.com/codecheckers/codecheckers.github.io/tree/master/logo>
- We use Bootstrap for layout and styling
- We ensure accessibility with semantic HTML and ARIA attributes
- We follow responsive design principles for mobile compatibility
