import mongoose from 'mongoose';

// Atomic sequence generator, used for asset tags (AF-0001, AF-0002, ...).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. 'assetTag'
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function (name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

export default mongoose.model('Counter', counterSchema);