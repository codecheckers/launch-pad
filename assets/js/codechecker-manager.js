/**
 * CodecheckerManager - Handles fetching and managing codechecker data
 */
class CodecheckerManager {
    constructor() {
        this.codecheckers = [];
        this.isLoaded = false;
        this.isLoading = false;
        this.csvUrl = 'https://raw.githubusercontent.com/codecheckers/codecheckers/refs/heads/master/codecheckers.csv';
    }

    /**
     * Fetch and parse the codecheckers CSV file
     */
    async loadCodecheckers() {
        if (this.isLoaded || this.isLoading) {
            return this.codecheckers;
        }

        this.isLoading = true;

        try {
            console.log('Fetching codecheckers from:', this.csvUrl);

            const response = await fetch(this.csvUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            this.codecheckers = this.parseCSV(csvText);
            this.isLoaded = true;

            console.log(`Loaded ${this.codecheckers.length} codecheckers`);
            return this.codecheckers;

        } catch (error) {
            console.error('Failed to load codecheckers:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Parse CSV text into codechecker objects
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = this.parseCSVLine(lines[0]);

        console.log('CSV Headers:', headers);

        const codecheckers = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);

            if (values.length < headers.length) {
                continue; // Skip incomplete rows
            }

            const codechecker = {};
            headers.forEach((header, index) => {
                codechecker[header.trim()] = values[index] ? values[index].trim() : '';
            });

            // Extract the fields we need
            const processedCodechecker = {
                name: codechecker.name || codechecker.Name || '',
                handle: this.extractHandle(codechecker.github || codechecker.GitHub || codechecker.handle || ''),
                skills: codechecker.skills || codechecker.Skills || '',
                language: codechecker.language || codechecker.Language || '',
                fields: codechecker.fields || codechecker.Fields || '',
                orcid: this.extractOrcid(codechecker.orcid || codechecker.ORCID || ''),
                raw: codechecker // Keep original data for debugging
            };

            // Create a comprehensive skills array combining skills, language, and fields
            processedCodechecker.allSkills = this.parseSkills(
                processedCodechecker.skills,
                processedCodechecker.language,
                processedCodechecker.fields
            );

            // Only include if we have at least a name or handle
            if (processedCodechecker.name || processedCodechecker.handle) {
                codecheckers.push(processedCodechecker);
            }
        }

        return codecheckers.sort((a, b) => {
            const nameA = a.name || a.handle || '';
            const nameB = b.name || b.handle || '';
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Parse a single CSV line, handling quoted fields
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        // Add the last field
        result.push(current);

        return result;
    }

    /**
     * Extract GitHub handle from various formats
     */
    extractHandle(githubField) {
        if (!githubField) return '';

        // Remove common prefixes
        let handle = githubField
            .replace(/^https?:\/\/github\.com\//, '')
            .replace(/^github\.com\//, '')
            .replace(/^@/, '')
            .trim();

        // Remove trailing slashes and additional path components
        handle = handle.split('/')[0];

        return handle;
    }

    /**
     * Extract and format ORCID
     */
    extractOrcid(orcidField) {
        if (!orcidField) return '';

        // Extract ORCID ID from various formats
        const orcidMatch = orcidField.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/);
        return orcidMatch ? orcidMatch[1] : '';
    }

    /**
     * Parse and combine skills from multiple fields
     */
    parseSkills(skills, language, fields) {
        const allSkills = [];

        // Parse each field separately since they may have different formats
        [skills, language, fields].forEach(field => {
            if (field && field.trim()) {
                // Split by common separators and clean up
                const fieldSkills = field
                    .split(/[,;\\n\\r]+/)
                    .map(skill => skill.trim())
                    .filter(skill => skill.length > 0)
                    .filter(skill => skill.length < 50) // Filter out very long entries that might be descriptions
                    .map(skill => skill.toLowerCase());

                allSkills.push(...fieldSkills);
            }
        });

        // Remove duplicates and return unique skills
        return [...new Set(allSkills)];
    }

    /**
     * Search codecheckers by name, handle, or skills
     */
    searchCodecheckers(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const normalizedQuery = query.toLowerCase();

        return this.codecheckers
            .filter(codechecker => {
                const name = (codechecker.name || '').toLowerCase();
                const handle = (codechecker.handle || '').toLowerCase();
                const skills = codechecker.allSkills || [];

                // Check if query matches name or handle
                const nameMatch = name.includes(normalizedQuery);
                const handleMatch = handle.includes(normalizedQuery);

                // Check if query matches any skill
                const skillMatch = skills.some(skill => skill.includes(normalizedQuery));

                return nameMatch || handleMatch || skillMatch;
            })
            .map(codechecker => {
                // Add match information for highlighting
                return {
                    ...codechecker,
                    matchInfo: this.getMatchInfo(codechecker, normalizedQuery)
                };
            })
            .slice(0, 10); // Limit to 10 results for performance
    }

    /**
     * Get information about what parts of the codechecker match the search query
     */
    getMatchInfo(codechecker, query) {
        const matchInfo = {
            nameMatches: [],
            handleMatches: [],
            skillMatches: []
        };

        const name = (codechecker.name || '').toLowerCase();
        const handle = (codechecker.handle || '').toLowerCase();
        const skills = codechecker.allSkills || [];

        // Find name matches
        if (name.includes(query)) {
            matchInfo.nameMatches.push(query);
        }

        // Find handle matches
        if (handle.includes(query)) {
            matchInfo.handleMatches.push(query);
        }

        // Find skill matches
        skills.forEach(skill => {
            if (skill.includes(query)) {
                matchInfo.skillMatches.push(skill);
            }
        });

        return matchInfo;
    }

    /**
     * Get codechecker by exact handle match
     */
    getCodecheckerByHandle(handle) {
        if (!handle) return null;

        return this.codecheckers.find(codechecker =>
            codechecker.handle === handle
        );
    }

    /**
     * Highlight matching terms in text
     */
    highlightMatches(text, query) {
        if (!text || !query) return text;

        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Format skills list with highlighting
     */
    formatSkillsWithHighlight(skills, matchingSkills, query) {
        if (!skills || skills.length === 0) return '';

        // Show all skills without abbreviation
        const formattedSkills = skills.map(skill => {
            const isMatching = matchingSkills.includes(skill.toLowerCase());
            const capitalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1);

            if (isMatching) {
                return this.highlightMatches(capitalizedSkill, query);
            }
            return capitalizedSkill;
        });

        return formattedSkills.join(', ');
    }

    /**
     * Format ORCID URL
     */
    formatOrcidUrl(orcid) {
        if (!orcid) return '';
        return `https://orcid.org/${orcid}`;
    }
}