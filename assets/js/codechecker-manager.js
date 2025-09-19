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
     * Parse CSV text into codechecker objects using Papa Parse
     */
    parseCSV(csvText) {
        console.log('Parsing CSV with Papa Parse...');

        // Use Papa Parse to handle the CSV parsing properly
        const parseResult = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: function(header) {
                return header.trim();
            },
            transform: function(value) {
                return value ? value.trim() : '';
            }
        });

        if (parseResult.errors.length > 0) {
            console.warn('CSV parsing errors:', parseResult.errors);
        }

        console.log('CSV Headers:', parseResult.meta.fields);
        console.log(`Parsed ${parseResult.data.length} rows`);

        const codecheckers = [];

        parseResult.data.forEach((row, index) => {
            // Extract the fields we need (handle different possible column names)
            const processedCodechecker = {
                name: row.name || row.Name || '',
                handle: this.extractHandle(row.github || row.GitHub || row.handle || ''),
                skills: row.skills || row.Skills || '',
                language: row.language || row.Language || row.languages || row.Languages || '',
                fields: row.fields || row.Fields || '',
                orcid: this.extractOrcid(row.orcid || row.ORCID || ''),
                raw: row // Keep original data for debugging
            };

            // Create a comprehensive skills array combining skills, language, and fields
            processedCodechecker.allSkills = this.parseSkills(
                processedCodechecker.skills,
                processedCodechecker.language,
                processedCodechecker.fields
            );

            // Debug logging for specific users to verify parsing
            if (processedCodechecker.handle === 'nuest') {
                console.log('Parsed data for nuest:');
                console.log('  Skills:', processedCodechecker.skills);
                console.log('  Language:', processedCodechecker.language);
                console.log('  Fields:', processedCodechecker.fields);
                console.log('  All Skills:', processedCodechecker.allSkills);
                console.log('  Raw row:', processedCodechecker.raw);
            }

            // Only include if we have at least a name or handle
            if (processedCodechecker.name || processedCodechecker.handle) {
                codecheckers.push(processedCodechecker);
            } else {
                console.log(`Skipping row ${index + 1}: no name or handle found`, processedCodechecker);
            }
        });

        return codecheckers.sort((a, b) => {
            const nameA = a.name || a.handle || '';
            const nameB = b.name || b.handle || '';
            return nameA.localeCompare(nameB);
        });
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
                    .split(/[,;]+/)  // Only split on commas and semicolons
                    .map(skill => skill.trim())
                    .filter(skill => skill.length > 0)
                    .filter(skill => skill.length < 50); // Filter out very long entries that might be descriptions
                    // Removed .toLowerCase() to preserve original capitalization

                allSkills.push(...fieldSkills);
            }
        });

        // Remove duplicates and return unique skills (case-sensitive comparison)
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

                // Check if query matches any skill (case-insensitive)
                const skillMatch = skills.some(skill => skill.toLowerCase().includes(normalizedQuery));

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

        // Find skill matches (case-insensitive)
        skills.forEach(skill => {
            if (skill.toLowerCase().includes(query)) {
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

        // Show all skills without abbreviation, preserving original capitalization
        const formattedSkills = skills.map(skill => {
            const isMatching = matchingSkills.includes(skill);

            if (isMatching) {
                return this.highlightMatches(skill, query);
            }
            return skill;
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