import mongoose from 'mongoose';

const AUDIT_STATUS = {
  OPEN: 'Open',
  CLOSED: 'Closed',
};

const AUDIT_ENTRY_STATUS = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
};

const auditEntrySchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    expectedLocation: { type: String, default: '' },
    verificationStatus: {
      type: String,
      enum: Object.values(AUDIT_ENTRY_STATUS),
      default: AUDIT_ENTRY_STATUS.PENDING,
    },
    notes: { type: String, default: '' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const auditCycleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(AUDIT_STATUS),
      default: AUDIT_STATUS.OPEN,
      index: true,
    },
    startsOn: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    entries: { type: [auditEntrySchema], default: [] },
    discrepancyCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export { AUDIT_STATUS, AUDIT_ENTRY_STATUS };
export default mongoose.model('AuditCycle', auditCycleSchema);
