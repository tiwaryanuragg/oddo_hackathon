import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { ROLES, ASSET_STATUS } from './constants.js';
import User from './models/User.js';
import Department from './models/Department.js';
import Category from './models/Category.js';
import Asset from './models/Asset.js';
import Allocation from './models/Allocation.js';
import Counter from './models/Counter.js';
import TransferRequest from './models/TransferRequest.js';
import Booking from './models/Booking.js';
import MaintenanceRequest from './models/MaintenanceRequest.js';
import AuditCycle from './models/AuditCycle.js';
import Notification from './models/Notification.js';
import ActivityLog from './models/ActivityLog.js';
import { nextAssetTag } from './utils/helpers.js';

async function makeUser({ name, email, role, department, password = 'password123' }) {
  const u = new User({ name, email, role, department });
  await u.setPassword(password);
  await u.save();
  return u;
}

async function run() {
  await connectDB(process.env.MONGO_URI);
  console.log('[seed] clearing collections...');
  await Promise.all([
    User.deleteMany({}), Department.deleteMany({}), Category.deleteMany({}),
    Asset.deleteMany({}), Allocation.deleteMany({}), Counter.deleteMany({}),
    TransferRequest.deleteMany({}), Booking.deleteMany({}), MaintenanceRequest.deleteMany({}),
    AuditCycle.deleteMany({}), Notification.deleteMany({}), ActivityLog.deleteMany({}),
  ]);

  // --- Users & roles (roles assigned here, never at signup) ---
  const admin = await makeUser({ name: 'Asha Admin', email: 'admin@assetflow.com', role: ROLES.ADMIN });
  const manager = await makeUser({ name: 'Manoj Manager', email: 'manager@assetflow.com', role: ROLES.ASSET_MANAGER });

  // --- Departments ---
  const engineering = await Department.create({ name: 'Engineering', status: 'Active' });
  const facilities = await Department.create({ name: 'Facilities', status: 'Active' });
  const fieldOps = await Department.create({ name: 'Field Ops (East)', status: 'Inactive' });

  const aditi = await makeUser({ name: 'Aditi Rao', email: 'aditi@assetflow.com', role: ROLES.DEPARTMENT_HEAD, department: engineering._id });
  const rohan = await makeUser({ name: 'Rohan Mehta', email: 'rohan@assetflow.com', role: ROLES.DEPARTMENT_HEAD, department: facilities._id });
  const priya = await makeUser({ name: 'Priya Shah', email: 'priya@assetflow.com', role: ROLES.EMPLOYEE, department: engineering._id });
  const raj = await makeUser({ name: 'Raj Verma', email: 'raj@assetflow.com', role: ROLES.EMPLOYEE, department: engineering._id });

  engineering.head = aditi._id; await engineering.save();
  facilities.head = rohan._id; await facilities.save();

  // --- Categories ---
  const electronics = await Category.create({
    name: 'Electronics',
    customFields: [{ label: 'Warranty (months)', type: 'number' }],
  });
  const furniture = await Category.create({ name: 'Furniture' });
  const vehicles = await Category.create({ name: 'Vehicles' });

  // --- Assets ---
  async function asset(data) {
    const tag = await nextAssetTag();
    return Asset.create({ tag, ...data });
  }
  const laptop = await asset({ name: 'Dell Laptop', category: electronics._id, serialNumber: 'DL-99123', location: 'Bengaluru', condition: 'Good', status: ASSET_STATUS.AVAILABLE });
  const projector = await asset({ name: 'Projector', category: electronics._id, serialNumber: 'PJ-4421', location: 'HQ Floor 2', condition: 'Fair', status: ASSET_STATUS.UNDER_MAINTENANCE });
  const chair = await asset({ name: 'Office Chair', category: furniture._id, location: 'Warehouse', condition: 'Good', status: ASSET_STATUS.AVAILABLE });
  const confRoom = await asset({ name: 'Conference Room B2', category: furniture._id, location: 'HQ Floor 1', bookable: true });
  const van = await asset({ name: 'Delivery Van', category: vehicles._id, serialNumber: 'VN-3391', location: 'Depot', bookable: true });

  // Allocate the laptop to Priya to demonstrate the double-allocation block.
  await Allocation.create({ asset: laptop._id, employee: priya._id, allocatedBy: manager._id });
  laptop.status = ASSET_STATUS.ALLOCATED; laptop.currentHolder = priya._id; laptop.currentDepartment = engineering._id;
  await laptop.save();

  // Demonstrate active and conflicting booking slots for the resource booking screen.
  const now = new Date();
  const slot1Start = new Date(now); slot1Start.setHours(9, 0, 0, 0);
  const slot1End = new Date(now); slot1End.setHours(10, 0, 0, 0);
  const slot2Start = new Date(now); slot2Start.setHours(11, 0, 0, 0);
  const slot2End = new Date(now); slot2End.setHours(12, 0, 0, 0);

  await Booking.create([
    { asset: confRoom._id, requestedBy: manager._id, startAt: slot1Start, endAt: slot1End, purpose: 'Procurement sync' },
    { asset: confRoom._id, requestedBy: aditi._id, startAt: slot2Start, endAt: slot2End, purpose: 'Engineering standup' },
  ]);

  // Maintenance workflow cards in different statuses for kanban visualization.
  await MaintenanceRequest.create([
    { asset: projector._id, issue: 'Noisy fan and overheating', requestedBy: priya._id, status: 'Pending' },
    { asset: van._id, issue: 'Brake service due', requestedBy: rohan._id, status: 'Approved', decidedBy: manager._id, decidedAt: now },
    { asset: chair._id, issue: 'Hydraulic cylinder damaged', requestedBy: raj._id, status: 'In Progress', decidedBy: manager._id, decidedAt: now, assignedTechnician: 'S. Verma' },
  ]);

  // Transfer queue item for allocation-and-transfer screen.
  await TransferRequest.create({
    asset: laptop._id,
    fromUser: priya._id,
    toUser: raj._id,
    requestedBy: aditi._id,
    reason: 'Temporary reassignment for client demo',
    status: 'Requested',
  });

  // One open audit cycle with mixed verification results.
  await AuditCycle.create({
    title: 'Q3 Engineering Audit',
    department: engineering._id,
    startedBy: manager._id,
    status: 'Open',
    entries: [
      { asset: laptop._id, expectedLocation: 'Desk E12', verificationStatus: 'Verified', verifiedBy: manager._id, verifiedAt: now },
      { asset: projector._id, expectedLocation: 'Room B2', verificationStatus: 'Missing', notes: 'Not found in expected location' },
      { asset: chair._id, expectedLocation: 'Warehouse', verificationStatus: 'Damaged', notes: 'Backrest broken' },
    ],
    discrepancyCount: 2,
  });

  await Notification.create([
    { user: priya._id, type: 'Asset Assigned', category: 'Info', message: `${laptop.tag} was assigned to you` },
    { user: manager._id, type: 'Transfer Requested', category: 'Approval', message: `Transfer requested for ${laptop.tag}` },
    { user: manager._id, type: 'Overdue Return Alert', category: 'Alert', message: `${laptop.tag} return is overdue` },
  ]);

  await ActivityLog.create([
    { actor: manager._id, action: 'asset.allocated', message: `${laptop.tag} allocated to Priya`, entityType: 'Asset', entityId: laptop._id },
    { actor: aditi._id, action: 'transfer.requested', message: `Transfer requested for ${laptop.tag}`, entityType: 'Asset', entityId: laptop._id },
    { actor: priya._id, action: 'maintenance.requested', message: `Maintenance requested for ${projector.tag}`, entityType: 'Asset', entityId: projector._id },
  ]);

  console.log('\n[seed] done. Login accounts (password: password123):');
  console.table([
    { role: 'Admin', email: admin.email },
    { role: 'Asset Manager', email: manager.email },
    { role: 'Department Head', email: aditi.email },
    { role: 'Employee', email: priya.email },
  ]);
  console.log(`Assets: ${laptop.tag} (allocated to Priya), ${projector.tag}, ${chair.tag}, ${confRoom.tag}, ${van.tag}`);
  console.log('[seed] Added demo transfer, booking slots, maintenance cards, audit cycle, notifications, and activity log data.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});