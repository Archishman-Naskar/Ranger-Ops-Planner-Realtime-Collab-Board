import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICard extends Document {
  title: string;
  description: string;
  list: Types.ObjectId;           // reference to List
}

const cardSchema = new Schema<ICard>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },

    list: { 
      type: Schema.Types.ObjectId, 
      ref: "List", 
      required: true 
    }
  },
  { timestamps: true }
);

export default mongoose.models.Card ||
  mongoose.model<ICard>("Card", cardSchema);
