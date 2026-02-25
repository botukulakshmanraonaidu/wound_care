import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wards = ['Burn Unit', 'ICU', 'General Ward', 'Pediatrics', 'Emergency'];
const genders = ['Male', 'Female'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

const patients = [];

for (let i = 1; i <= 50; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? `MaleFirst${i}` : `FemaleFirst${i}`; // Simple mock names
    // Let's make them slightly more realistic
    const firstNamesM = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles'];
    const firstNamesF = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    const fName = isMale ? firstNamesM[getRandomInt(0, firstNamesM.length - 1)] : firstNamesF[getRandomInt(0, firstNamesF.length - 1)];
    const lName = lastNames[getRandomInt(0, lastNames.length - 1)];

    patients.push({
        id: i,
        firstName: fName,
        lastName: lName,
        mrn: `MRN-${100000 + i}`,
        dob: getRandomDate(new Date(1950, 0, 1), new Date(2000, 0, 1)),
        gender: isMale ? 'Male' : 'Female',
        admissionDate: getRandomDate(new Date(2023, 0, 1), new Date(2023, 11, 31)),
        ward: wards[getRandomInt(0, wards.length - 1)]
    });
}

const dir = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(dir, 'patients.json'), JSON.stringify(patients, null, 2));
console.log('Successfully generated 50 patients in src/data/patients.json');
