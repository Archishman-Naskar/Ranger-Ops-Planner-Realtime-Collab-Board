import mongoose, { Schema, Document, Types } from "mongoose";

export interface IList extends Document {
  title: string;
  board: Types.ObjectId;         // board reference
  cards: Types.ObjectId[];       // ordered list of card IDs
}

const listSchema = new Schema<IList>(
  {
    title: { type: String, required: true },

    board: { 
      type: Schema.Types.ObjectId, 
      ref: "Board", 
      required: true 
    },

    cards: [
      { 
        type: Schema.Types.ObjectId, 
        ref: "Card" 
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.List ||
  mongoose.model<IList>("List", listSchema);
