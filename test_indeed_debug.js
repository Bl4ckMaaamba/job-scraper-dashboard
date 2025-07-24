function parseCsvCompanies(csvContent) {
    console.log('CSV reçu:', JSON.stringify(csvContent));
    const companies = [];
    const lines = csvContent.trim().split('\n');
    console.log('Lines après split:', lines);
    
    if (!lines.length) return companies;
    
    // Debug: voir si on a un en-tête ou pas
    const hasHeader = lines[0].toLowerCase().includes('nom') || lines[0].toLowerCase().includes('company');
    console.log('Has header:', hasHeader);
    
    const csvLines = hasHeader ? lines.slice(1) : lines;
    console.log('Lines après slice:', csvLines);
    
    csvLines.forEach((line, index) => {
        console.log(`Processing line ${index}:`, JSON.stringify(line));
        const parts = line.split(',');
        if (parts.length > 0) {
            const company = parts[0].trim().replace(/"/g, '');
            console.log(`Extracted company:`, JSON.stringify(company));
            if (company && company.length > 0 && !companies.includes(company)) {
                companies.push(company);
                console.log(`Added company:`, company);
            }
        }
    });
    
    console.log('Final companies:', companies);
    return companies;
}

// Test
console.log('=== Test 1: Simple ===');
parseCsvCompanies("ACCESSITE");

console.log('\n=== Test 2: With header ===');
parseCsvCompanies("nom,secteur\nACCESSITE,Immobilier");

console.log('\n=== Test 3: Multiple companies ===');
parseCsvCompanies("ACCESSITE\nADVANTAIL\nTELMMA");
