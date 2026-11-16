const fs = require('fs');

const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

const eqdOfficer = db.users.find(u => u.username === 'eqd.officer');
const eqdNormal = db.users.find(u => u.username === 'eqd');

const eqdOrgIds = new Set([
  'org-moe-div-eqd', 'org-moe-eqd', 'org-moe-eqd-dev', 'org-moe-lang-humanities',
  'org-moe-science', 'org-moe-maths', 'org-moe-english', 'org-moe-commerce',
  'org-moe-aesthetics', 'org-moe-religion', 'org-moe-bilingual', 'org-moe-qa',
  'org-moe-agri', 'org-moe-tech'
]);

function canView(user, workshop) {
  if (user.roleName === 'System Administrator' || user.username === 'admin') return true;
  if (workshop.createdBy === user.id) return true;
  
  if (user.username === 'eqd.officer') {
    if (
      (workshop.organizingOrgId && eqdOrgIds.has(workshop.organizingOrgId)) ||
      (workshop.placeId && eqdOrgIds.has(workshop.placeId)) ||
      (workshop.targetOrgId && eqdOrgIds.has(workshop.targetOrgId))
    ) {
      return true;
    }
  }

  if (
    workshop.organizingOrgId === user.organizationId ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }

  if (
    workshop.placeId === user.organizationId ||
    workshop.targetOrgId === user.organizationId
  ) {
    return true;
  }

  return false;
}

const officerWorkshops = db.workshops.filter(w => canView(eqdOfficer, w));
const normalWorkshops = db.workshops.filter(w => canView(eqdNormal, w));

console.log('Total workshops in system:', db.workshops.length);
console.log('Workshops visible to eqd.officer (Division Scope):', officerWorkshops.length);
console.log('Workshops visible to eqd (Normal Branch Scope):', normalWorkshops.length);

const officerBranches = new Set(officerWorkshops.map(w => w.branch || w.organizingOrgId));
console.log('Branches visible to eqd.officer:', Array.from(officerBranches));
const normalBranches = new Set(normalWorkshops.map(w => w.branch || w.organizingOrgId));
console.log('Branches visible to eqd (Normal):', Array.from(normalBranches));
